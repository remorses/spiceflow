import addFormats from 'ajv-formats'
import lodashCloneDeep from 'lodash.clonedeep'

import superjson from 'superjson'
import {
  ComposeSpiceflowResponse,
  ContentType,
  CreateClient,
  DefinitionBase,
  ErrorHandler,
  HTTPMethod,
  InlineHandler,
  InputSchema,
  InternalRoute,
  IsAny,
  JoinPath,
  LocalHook,
  MaybeArray,
  MetadataBase,
  MiddlewareHandler,
  Reconcile,
  ResolvePath,
  RouteBase,
  RouteSchema,
  SingletonBase,
  TypeSchema,
  UnwrapRoute,
} from './types.js'
let globalIndex = 0

import Ajv, { ValidateFunction } from 'ajv'
import { z, ZodType } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { Context, MiddlewareContext } from './context.js'
import { isProduction, ValidationError } from './error.js'
import { isAsyncIterable, isResponse, redirect } from './utils.js'
import { createElement, isValidElement } from 'react'

import value from 'virtual:build-client-references'
import { FlightData, LayoutContent } from './react/components.js'
import { TrieRouter } from './trie-router/router.js'
import {
  ParamIndexMap,
  Params,
  ParamStash,
  Result,
} from './trie-router/utils.js'
import { decodeURIComponent_, tryDecode } from './trie-router/url.js'
import path from 'path'

const ajv = (addFormats.default || addFormats)(
  new (Ajv.default || Ajv)({ useDefaults: true }),
  [
    'date-time',
    'time',
    'date',
    'email',
    'hostname',
    'ipv4',
    'ipv6',
    'uri',
    'uri-reference',
    'uuid',
    'uri-template',
    'json-pointer',
    'relative-json-pointer',
    'regex',
  ],
)

// Should be exported from `hono/router`

type AsyncResponse = Response | Promise<Response>

type OnError = (x: { error: any; request: Request }) => AsyncResponse

const notFoundHandler = (c) => {
  return new Response('Not Found', { status: 404 })
}

export class Spiceflow<
  const in out BasePath extends string = '',
  const in out Scoped extends boolean = true,
  const in out Singleton extends SingletonBase = {
    state: {}
  },
  const in out Definitions extends DefinitionBase = {
    type: {}
    error: {}
  },
  const in out Metadata extends MetadataBase = {
    schema: {}
    macro: {}
    macroFn: {}
  },
  const out Routes extends RouteBase = {},
> {
  private id: number = globalIndex++
  router: TrieRouter<InternalRoute> = new TrieRouter()
  private middlewares: Function[] = []
  private onErrorHandlers: OnError[] = []
  private routes: InternalRoute[] = []
  private defaultState: Record<any, any> = {}
  topLevelApp?: AnySpiceflow

  /** @internal */
  prefix?: string

  /** @internal */
  childrenApps: AnySpiceflow[] = []

  /** @internal */
  getAllRoutes() {
    let root = this.topLevelApp || this
    const allApps = bfs(root) || []
    const allRoutes = allApps.flatMap((x) => {
      const prefix = this.getAppAndParents(x)
        .map((x) => x.prefix)
        .join('')

      return x.routes.map((x) => ({ ...x, path: prefix + x.path }))
    })
    return allRoutes
  }

  private add({
    method,
    path,
    hooks,
    handler,

    ...rest
  }: Partial<InternalRoute>) {
    const kind = rest.kind
    let bodySchema: TypeSchema = hooks?.body
    let validateBody = getValidateFunction(bodySchema)
    let validateQuery = getValidateFunction(hooks?.query)
    let validateParams = getValidateFunction(hooks?.params)

    if (typeof handler === 'function' && !handler.name) {
      Object.defineProperty(handler, 'name', {
        value: path,
        configurable: true,
      })
    }

    // remove trailing slash which can cause problems
    path = path?.replace(/\/$/, '') || '/'
    let route: InternalRoute = {
      ...rest,
      type: hooks?.type || '',
      method: (method || '') as any,
      path: path || '',
      handler: handler!,
      hooks,
      validateBody,
      validateParams,
      validateQuery,
    }
    this.router.add(method!, path, route)

    this.routes.push(route)
  }

  routeIndex = 0

  private getAllDecodedParams(
    matchResult: Result<InternalRoute>,
    pathname: string,
  ): Record<string, string> {
    if (!matchResult?.length || !matchResult?.[0]?.[this.routeIndex]?.[1]) {
      console.log('no match result', matchResult)
      return {}
    }
    const internalRoute =
      matchResult[0].find(([route]) => route.path.includes('*'))?.[0] ||
      matchResult[0][this.routeIndex][0]

    const decoded: Record<string, string> =
      extractWildcardParam(internalRoute?.path, pathname) || {}

    const keys = Object.keys(matchResult[0][this.routeIndex][1])
    for (const key of keys) {
      const value = matchResult[0][this.routeIndex][1][key]
      if (value && typeof value === 'string') {
        decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value
      }
    }

    return decoded
  }

  private match(method: string, path: string) {
    let root = this
    let foundApp: AnySpiceflow | undefined
    let originalPath = path
    // remove trailing slash which can cause problems
    path = path.replace(/\/$/, '') || '/'
    const result = bfsFind(this, (app) => {
      app.topLevelApp = root
      let prefix = this.getAppAndParents(app)
        .map((x) => x.prefix)
        .join('')
        .replace(/\/$/, '')
      if (prefix && !path.startsWith(prefix)) {
        return
      }
      let pathWithoutPrefix = path
      if (prefix) {
        pathWithoutPrefix = path.replace(prefix, '') || '/'
      }

      const matchedRoutes = app.router.match(method, pathWithoutPrefix)
      if (!matchedRoutes?.length) {
        foundApp = app
        return
      }

      const internalRoute = matchedRoutes?.[0]?.[0]?.[0]

      const params = this.getAllDecodedParams(matchedRoutes, originalPath)

      if (internalRoute) {
        const res = {
          ...matchedRoutes,
          app,
          internalRoute: internalRoute,
          params,
        }
        return res
      }
      if (method === 'HEAD') {
        const matched = app.router.match('GET', pathWithoutPrefix)
        if (matched) {
          const [[[internalRouteGet]]] = matched

          return {
            ...matchedRoutes,
            app,
            internalRoute: {
              hooks: {},
              handler:
                internalRouteGet.handler ||
                ((c) => {
                  return new Response(null, { status: 200 })
                }),
              method,
              path,
            } as InternalRoute,
            params: this.getAllDecodedParams(matched, originalPath),
          }
        }
      }
    })

    return (
      result || {
        kind: undefined,
        app: foundApp || root,
        internalRoute: {
          hooks: {},
          handler: notFoundHandler,
          method,
          path,
        } as InternalRoute,
        params: {},
      }
    )
  }

  state<const Name extends string | number | symbol, Value>(
    name: Name,
    value?: Value,
  ): Spiceflow<
    BasePath,
    Scoped,
    {
      state: Reconcile<
        Singleton['state'],
        {
          [name in Name]: Value
        }
      >
    },
    Definitions,
    Metadata,
    Routes
  > {
    this.defaultState[name] = value
    return this as any
  }

  /**
   * Create a new Router
   * @param options {@link RouterOptions} {@link Platform}
   */
  constructor(
    options: {
      name?: string
      scoped?: Scoped

      basePath?: BasePath
    } = {},
  ) {
    this.scoped = options.scoped

    this.prefix = options.basePath
  }

  _routes: Routes = {} as any

  _types = {
    Prefix: '' as BasePath,
    Scoped: false as Scoped,
    Singleton: {} as Singleton,
    Definitions: {} as Definitions,
    Metadata: {} as Metadata,
  }

  post<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          post: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']
            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    this.add({ method: 'POST', path, handler: handler, hooks: hook })

    return this as any
  }

  get<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Macro extends Metadata['macro'],
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Macro,
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          get: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    this.add({ method: 'GET', path, handler: handler, hooks: hook })
    return this as any
  }

  put<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          put: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    this.add({ method: 'PUT', path, handler: handler, hooks: hook })

    return this as any
  }

  patch<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          patch: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    this.add({ method: 'PATCH', path, handler: handler, hooks: hook })

    return this as any
  }

  delete<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          delete: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    this.add({ method: 'DELETE', path, handler: handler, hooks: hook })

    return this as any
  }

  options<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          options: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    this.add({ method: 'OPTIONS', path, handler: handler, hooks: hook })

    return this as any
  }

  all<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          [method in string]: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    for (const method of METHODS) {
      this.add({ method, path, handler: handler, hooks: hook })
    }

    return this as any
  }

  head<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    Routes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          head: {
            body: Schema['body']
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >
  > {
    this.add({ method: 'HEAD', path, handler: handler, hooks: hook })

    return this as any
  }

  page<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<BasePath, Scoped, Singleton, Definitions, Metadata, Routes> {
    this.add({
      method: 'GET',
      path,
      handler: handler,
      hooks: hook,
      kind: 'page',
    })
    this.add({
      method: 'POST',
      path,
      handler: handler,
      hooks: hook,
      kind: 'page',
    })
    return this as any
  }
  layout<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
  >(
    path: Path,
    handler: Handle,
    hook?: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    >,
  ): Spiceflow<BasePath, Scoped, Singleton, Definitions, Metadata, Routes> {
    this.add({
      method: 'GET',
      path,
      handler: handler,
      hooks: hook,
      kind: 'layout',
    })
    this.add({
      method: 'POST',
      path,
      handler: handler,
      hooks: hook,
      kind: 'layout',
    })
    return this as any
  }

  private scoped?: Scoped = true as Scoped

  use<const NewSpiceflow extends AnySpiceflow>(
    instance: NewSpiceflow,
  ): IsAny<NewSpiceflow> extends true
    ? this
    : Spiceflow<
        BasePath,
        Scoped,
        Singleton,
        Definitions,
        Metadata,
        BasePath extends ``
          ? Routes & NewSpiceflow['_routes']
          : Routes & CreateClient<BasePath, NewSpiceflow['_routes']>
      >
  use<const Schema extends RouteSchema>(
    handler: MiddlewareHandler<
      Schema,
      {
        state: Singleton['state']
      }
    >,
  ): this

  use(appOrHandler) {
    if (appOrHandler instanceof Spiceflow) {
      this.childrenApps.push(appOrHandler)
    } else if (typeof appOrHandler === 'function') {
      this.middlewares ??= []
      this.middlewares.push(appOrHandler)
    }
    return this
  }

  onError<const Schema extends RouteSchema>(
    handler: MaybeArray<ErrorHandler<Definitions['error'], Schema, Singleton>>,
  ): this {
    this.onErrorHandlers ??= []
    this.onErrorHandlers.push(handler as any)

    return this
  }

  async handle(request: Request) {
    let u = new URL(request.url, 'http://localhost')
    const self = this
    let path = u.pathname
    const defaultContext = {
      redirect,
      error: null,
      children: undefined,
      path,
    }
    const root = this.topLevelApp || this
    let onErrorHandlers: OnError[] = []

    const route = this.match(request.method, path)

    const appsInScope = this.getAppsInScope(route.app)
    onErrorHandlers = appsInScope.flatMap((x) => x.onErrorHandlers)
    let {
      params: _params,
      app: { defaultState },
    } = route
    const middlewares = appsInScope.flatMap((x) => x.middlewares)

    let state = cloneDeep(defaultState)

    let content = route?.internalRoute?.hooks?.content

    if (route.internalRoute?.validateBody) {
      // TODO don't clone the request
      let typedRequest =
        request instanceof SpiceflowRequest
          ? request
          : new SpiceflowRequest(u, request)
      typedRequest.validateBody = route.internalRoute?.validateBody
      request = typedRequest
    }

    let index = 0
    let context = {
      ...defaultContext,
      request,
      state,
      path,
      query: parseQuery((u.search || '').slice(1)),
      params: _params,
      redirect,
    } satisfies MiddlewareContext<any>

    const kind = route?.internalRoute?.kind
    console.log('kind', kind)
    if (kind === 'page' || kind === 'layout') {
      try {
        const [page, ...layoutResults] = await Promise.all([
          route.internalRoute?.handler(context),
          ...route.layouts.map((layout) => {
            const internalRoute: InternalRoute = layout.store['GET']
            const children = createElement(LayoutContent, { id: layout.id })
            return internalRoute.handler({ ...context, children })
          }),
        ])

        let data: FlightData = {
          page,
          layouts: route.layouts.map((layout, i) => {
            return {
              id: layout.id,
              element: layoutResults[i] as any,
            }
          }),
        }
        console.log(data)
        return data
      } catch (err) {
        return await getResForError(err)
      }
    }
    let handlerResponse: Response | undefined
    async function getResForError(err: any) {
      if (isResponse(err)) return err
      let res = await self.runErrorHandlers({
        onErrorHandlers,
        error: err,
        request,
      })
      if (isResponse(res)) return res

      let status = err?.status ?? 500
      res ||= new Response(
        superjsonSerialize({
          ...err,
          message: err?.message || 'Internal Server Error',
        }),
        {
          status,
          headers: {
            'content-type': 'application/json',
          },
        },
      )
      return res
    }

    const next = async () => {
      try {
        if (index < middlewares.length) {
          const middleware = middlewares[index]
          index++

          const result = await middleware(context, next)
          if (isResponse(result)) {
            handlerResponse = result
          }
          if (!result && index < middlewares.length) {
            return await next()
          } else if (result) {
            return await turnHandlerResultIntoResponse(
              result,
              route.internalRoute,
            )
          }
        }
        if (handlerResponse) {
          return handlerResponse
        }

        context.query = runValidation(
          context.query,
          route.internalRoute?.validateQuery,
        )
        context.params = runValidation(
          context.params,
          route.internalRoute?.validateParams,
        )

        const res = await route.internalRoute?.handler(context)
        if (isAsyncIterable(res)) {
          handlerResponse = await this.handleStream({
            generator: res,
            request,
            onErrorHandlers,
            route: route.internalRoute,
          })
          return handlerResponse
        }
        handlerResponse = await turnHandlerResultIntoResponse(
          res,
          route.internalRoute,
        )
        return handlerResponse
      } catch (err) {
        handlerResponse = await getResForError(err)
        return await next()
      }
    }
    const response = await next()

    return response
  }

  private async runErrorHandlers({
    onErrorHandlers = [] as OnError[],
    error: err,
    request,
  }) {
    if (onErrorHandlers.length === 0) {
      console.error(`Spiceflow unhandled error:`, err)
    } else {
      for (const errHandler of onErrorHandlers) {
        const res = errHandler({ error: err, request })
        if (isResponse(res)) {
          return res
        }
      }
    }
  }

  private getAppAndParents(currentApp?: AnySpiceflow) {
    let root = this.topLevelApp || this

    if (!root.childrenApps.length) {
      return [root]
    }
    const parents: AnySpiceflow[] = []
    let current = currentApp

    const parentMap = new Map<number, AnySpiceflow>()
    bfsFind(root, (node) => {
      for (const child of node.childrenApps) {
        parentMap.set(child.id, node)
      }
    })

    // Traverse the parent map to get the parents
    while (current) {
      parents.unshift(current)
      current = parentMap.get(current.id)
    }

    return parents.filter((x) => x !== undefined)
  }

  private getAppsInScope(currentApp?: AnySpiceflow) {
    let root = this.topLevelApp || this
    if (!root.childrenApps.length) {
      return [root]
    }
    const withParents = this.getAppAndParents(currentApp)

    const wantedOrder = bfs(root)
    const scopeFalseApps = wantedOrder.filter((x) => x.scoped === false)
    let appsInScope = [] as AnySpiceflow[]
    for (const app of wantedOrder) {
      if (scopeFalseApps.includes(app)) {
        appsInScope.push(app)
        continue
      }
      if (withParents.includes(app)) {
        appsInScope.push(app)
        continue
      }
    }
    return appsInScope
  }

  async listen(port: number, hostname: string = '0.0.0.0') {
    // @ts-ignore
    if (typeof Bun !== 'undefined') {
      // @ts-ignore
      const server = Bun.serve({
        port,
        development: !isProduction,
        hostname,
        reusePort: true,
        error(error) {
          console.error(error)
          return new Response(
            superjsonSerialize({ message: 'Internal Server Error' }),
            {
              status: 500,
            },
          )
        },

        fetch: async (request) => {
          const res = await this.handle(request)
          return res
        },
      })
      process.on('beforeExit', () => {
        server.stop()
      })
      console.log(`Listening on http://localhost:${port}`)
      return server
    }
    return this.listenNode(port, hostname)
  }

  async listenNode(port: number, hostname: string = '0.0.0.0') {
    const { Readable } = await import('stream')
    const { createServer } = await import('http')

    const server = createServer(async (req, res) => {
      const abortController = new AbortController()
      const { signal } = abortController

      req.on('error', (err) => {
        abortController.abort()
      })
      req.on('aborted', (err) => {
        abortController.abort()
      })
      // this is how you see when a request is aborted in Node.js, laughable
      res.on('close', function () {
        let aborted = !res.writableFinished
        if (aborted) {
          abortController.abort()
        }
      })

      const url = new URL(
        req.url || '',
        `http://${req.headers.host || hostname || 'localhost'}`,
      )
      const typedRequest = new SpiceflowRequest(url.toString(), {
        method: req.method,
        headers: req.headers as HeadersInit,
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? (Readable.toWeb(req) as any)
            : null,
        signal,
        // @ts-ignore
        duplex: 'half',
        // keepalive: true,
      })

      try {
        const response = (await this.handle(typedRequest)) as Response

        res.statusCode = response.status
        for (const [key, value] of response.headers) {
          res.setHeader(key, value)
        }

        if (response.body) {
          const reader = response.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
          }
        }
        res.end()
      } catch (error) {
        console.error('Error handling request:', error)
        res.statusCode = 500
        res.end(superjsonSerialize({ message: 'Internal Server Error' }))
      }
    })

    await new Promise((resolve, reject) => {
      server.listen(port, hostname, () => {
        console.log(`Listening on http://localhost:${port}`)
        resolve(null)
      })
    })

    return server
  }
  private async handleStream({
    onErrorHandlers,
    generator,
    request,
    route,
  }: {
    generator: Generator | AsyncGenerator
    onErrorHandlers: OnError[]
    request: Request
    route: InternalRoute
  }) {
    let init = generator.next()
    if (init instanceof Promise) init = await init

    if (init?.done) {
      return await turnHandlerResultIntoResponse(init.value, route)
    }

    let self = this
    return new Response(
      new ReadableStream({
        async start(controller) {
          let end = false

          // Set up ping interval
          const pingInterval = setInterval(() => {
            if (!end) {
              controller.enqueue(Buffer.from('\n'))
            }
          }, 10 * 1000)

          request?.signal.addEventListener('abort', async () => {
            end = true
            clearInterval(pingInterval)

            // Using return() instead of throw() because:
            // 1. return() allows for cleanup in finally blocks
            // 2. throw() would trigger error handling which isn't needed for normal aborts
            // 3. return() is the more graceful way to stop iteration

            if ('return' in generator) {
              try {
                await generator.return(undefined)
              } catch {
                // Ignore errors from stopping generator
              }
            }

            try {
              controller.close()
            } catch {
              // nothing
            }
          })

          if (init?.value !== undefined && init?.value !== null)
            controller.enqueue(
              Buffer.from(
                'event: message\ndata: ' +
                  superjsonSerialize(init.value, false) +
                  '\n\n',
              ),
            )

          try {
            for await (const chunk of generator) {
              if (end) break
              if (chunk === undefined || chunk === null) continue

              controller.enqueue(
                Buffer.from(
                  'event: message\ndata: ' +
                    superjsonSerialize(chunk, false) +
                    '\n\n',
                ),
              )
            }
          } catch (error: any) {
            let res = await self.runErrorHandlers({
              onErrorHandlers: onErrorHandlers,
              error,
              request,
            })
            controller.enqueue(
              Buffer.from(
                'event: error\ndata: ' +
                  superjsonSerialize(
                    {
                      ...error,
                      message: error.message || error.name || 'Error',
                    },
                    false,
                  ) +
                  '\n\n',
              ),
            )
          }

          clearInterval(pingInterval)
          try {
            controller.close()
          } catch {
            // nothing
          }
        },
      }),
      {
        headers: {
          'transfer-encoding': 'chunked',
          'content-type': 'text/event-stream; charset=utf-8',
        },
      },
    )
  }
}

// async function getRequestBody({
// 	request,
// 	content,
// }: {
// 	content
// 	request: Request
// }) {
// 	let body: string | Record<string, any> | undefined
// 	if (request.method === 'GET' || request.method === 'HEAD') {
// 		return
// 	}

// 	const contentType =
// 		content || request.headers.get('content-type')?.split(';')?.[0]

// 	if (!contentType) {
// 		return
// 	}

// 	switch (contentType) {
// 		case 'application/json':
// 			body = (await request.json()) as any
// 			break

// 		case 'text/plain':
// 			body = await request.text()
// 			break

// 		case 'application/x-www-form-urlencoded':
// 			body = parseQuery.parse(await request.text()) as any
// 			break

// 		case 'application/octet-stream':
// 			body = await request.arrayBuffer()
// 			break

// 		case 'multipart/form-data':
// 			body = {}

// 			const form = await request.formData()
// 			for (const key of form.keys()) {
// 				if (body[key]) continue

// 				const value = form.getAll(key)
// 				if (value.length === 1) body[key] = value[0]
// 				else body[key] = value
// 			}

// 			break
// 	}

// 	return body
// }

const METHODS = [
  'ALL',
  'CONNECT',
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
  'TRACE',
] as const

/** HTTP method string */
export type Method = (typeof METHODS)[number]

function bfsFind<T>(
  tree: AnySpiceflow,
  onNode: (node: AnySpiceflow) => T | undefined | void,
): T | undefined {
  const queue = [tree]

  while (queue.length > 0) {
    const node = queue.shift()!

    const result = onNode(node)
    if (result) {
      return result
    }
    queue.push(...node.childrenApps)
  }
  return
}
export class SpiceflowRequest<T = any> extends Request {
  validateBody?: ValidateFunction

  async json(): Promise<T> {
    const body = (await super.json()) as Promise<T>
    return runValidation(body, this.validateBody)
  }
}

export function bfs(tree: AnySpiceflow) {
  const queue = [tree]
  let nodes: AnySpiceflow[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node) {
      nodes.push(node)
    }
    // const result = onNode(node)

    if (node?.childrenApps?.length) {
      queue.push(...node.childrenApps)
    }
  }
  return nodes
}

export async function turnHandlerResultIntoResponse(
  result: any,
  route: InternalRoute,
) {
  // if user returns a promise, await it
  if (result instanceof Promise) {
    result = await result
  }

  if (isResponse(result)) {
    return result
  }

  if (route.type) {
    if (route.type?.includes('multipart/form-data')) {
      if (!(result instanceof Response)) {
        throw new Error(
          `Invalid form data returned from route handler ${
            route.path
          } - expected Response but got ${
            result?.constructor?.name || typeof result
          }. FormData cannot be returned directly - it must be wrapped in a Response object with the appropriate content-type header.`,
        )
      }
    }
    if (route.type?.includes('application/x-www-form-urlencoded')) {
      if (!(result instanceof URLSearchParams)) {
        throw new Error(
          `Invalid URL encoded data returned from route handler ${
            route.path
          } - expected URLSearchParams but got ${
            result?.constructor?.name || typeof result
          }`,
        )
      }
      return new Response(result, {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      })
    }

    if (route.type?.includes('text/plain')) {
      if (typeof result !== 'string') {
        throw new Error(
          `Invalid text returned from route handler ${
            route.path
          } - expected string but got ${
            result?.constructor?.name || typeof result
          }`,
        )
      }
      return new Response(result, {
        headers: {
          'content-type': 'text/plain',
        },
      })
    }
  }

  return new Response(superjsonSerialize(result), {
    headers: {
      'content-type': 'application/json',
    },
  })
}

function superjsonSerialize(value: any, indent = false) {
  // return JSON.stringify(value)
  const { json, meta } = superjson.serialize(value)
  if (json && meta) {
    json['__superjsonMeta'] = meta
  }
  return JSON.stringify(json ?? null, null, indent ? 2 : undefined)
}

export type AnySpiceflow = Spiceflow<any, any, any, any, any, any>

export function isZodSchema(value: unknown): value is ZodType {
  return (
    value instanceof z.ZodType ||
    (typeof value === 'object' &&
      value !== null &&
      'parse' in value &&
      'safeParse' in value &&
      'optional' in value &&
      'nullable' in value)
  )
}

function getValidateFunction(schema: TypeSchema) {
  if (isZodSchema(schema)) {
    let jsonSchema = zodToJsonSchema(schema, {
      removeAdditionalStrategy: 'strict',
    })
    return ajv.compile(jsonSchema)
  }

  if (schema) {
    return ajv.compile(schema)
  }
}

function runValidation(value: any, validate?: ValidateFunction) {
  if (!validate) return value
  const valid = validate(value)
  if (!valid) {
    const error = ajv.errorsText(validate.errors, {
      separator: '\n',
    })
    throw new ValidationError(error)
  }
  return value
}

function parseQuery(queryString: string) {
  // Create a URLSearchParams instance
  const params = new URLSearchParams(queryString)

  // Convert to an object with arrays for repeated keys
  const paramsObject = {}
  for (const [key, value] of params) {
    // If the key already exists, convert to an array or push to the existing array
    if (paramsObject[key]) {
      paramsObject[key] = Array.isArray(paramsObject[key])
        ? [...paramsObject[key], value]
        : [paramsObject[key], value]
    } else {
      paramsObject[key] = value // Set the value if it's the first occurrence
    }
  }
  return paramsObject
}
export function extractWildcardParam(
  url: string,
  patternUrl: string,
): { '*'?: string } | null {
  // Return empty object if pattern has no wildcard
  if (!patternUrl.includes('*')) {
    return null
  }

  // Split pattern into parts before and after wildcard
  const [beforeWildcard] = patternUrl.split('*')

  // Get the part of URL after the pattern prefix
  const wildcardPart = url.slice(beforeWildcard.length)

  // If no wildcard content, return empty string
  if (!wildcardPart) {
    return null
  }

  // Remove trailing slash from wildcard part
  const trimmedWildcard = wildcardPart.replace(/\/$/, '')

  return { '*': trimmedWildcard }
}

export function cloneDeep(x) {
  return lodashCloneDeep(x)
}

console.log(`piceflow running`)

const tryDecodeURIComponent = (str: string) =>
  tryDecode(str, decodeURIComponent_)
