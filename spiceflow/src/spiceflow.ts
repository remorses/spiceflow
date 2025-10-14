import { copy } from 'copy-anything'
import superjson from 'superjson'

import { SpiceflowFetchError } from './client/errors.ts'
import { ValidationError } from './error.ts'
import {
  ComposeSpiceflowResponse,
  ContentType,
  CreateClient,
  DefinitionBase,
  ErrorHandler,
  ExtractParamsFromPath,
  GetRequestSchema,
  HTTPMethod,
  InlineHandler,
  InputSchema,
  IsAny,
  JoinPath,
  LocalHook,
  MetadataBase,
  MiddlewareHandler,
  Reconcile,
  ResolvePath,
  RouteBase,
  RouteSchema,
  SingletonBase,
  TypeSchema,
  UnwrapRoute,
} from './types.ts'

import OriginalRouter from '@medley/router'
import { ZodType } from 'zod'

import { StandardSchemaV1 } from '@standard-schema/spec'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleForNode, listenForNode } from 'spiceflow/_node-server'
import { Context, MiddlewareContext } from './context.ts'

import { isAsyncIterable, isResponse, redirect } from './utils.ts'

let globalIndex = 0

type AsyncResponse = Response | Promise<Response>

export type SpiceflowServerError =
  | ValidationError
  | SpiceflowFetchError<number, any>
  | Error

export type WaitUntil = (promise: Promise<any>) => void

type OnError = (x: {
  error: SpiceflowServerError
  request: Request
  path: string
}) => AsyncResponse

type ValidationFunction = (
  value: unknown,
) => StandardSchemaV1.Result<any> | Promise<StandardSchemaV1.Result<any>>

export type InternalRoute = {
  method: HTTPMethod
  path: string
  type: ContentType
  handler: InlineHandler<any, any, any, any>
  hooks: LocalHook<any, any, any, any, any, any, any>
  validateBody?: ValidationFunction
  validateQuery?: ValidationFunction
  validateParams?: ValidationFunction
}

type MedleyRouter = {
  find: (path: string) =>
    | {
        store: Record<string, InternalRoute> //
        params: Record<string, any>
      }
    | undefined
  register: (path: string | undefined) => Record<string, InternalRoute>
}

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
  const out ClientRoutes extends RouteBase = {},
  const out RoutePaths extends string = '',
> {
  private id: number = globalIndex++
  private router: MedleyRouter = new OriginalRouter()
  private middlewares: Function[] = []
  private onErrorHandlers: OnError[] = []
  private routes: InternalRoute[] = []
  private defaultState: Record<any, any> = {}
  topLevelApp?: AnySpiceflow = this
  private waitUntilFn: WaitUntil
  private disableSuperJsonUnlessRpc: boolean = false

  _types = {
    Prefix: '' as BasePath,
    ClientRoutes: {} as ClientRoutes,
    RoutePaths: '' as RoutePaths,
    Scoped: false as Scoped,
    Singleton: {} as Singleton,
    Definitions: {} as Definitions,
    Metadata: {} as Metadata,
  }

  /** @internal */
  basePath?: string = ''

  /** @internal */
  childrenApps: AnySpiceflow[] = []

  /** @internal */
  getAllRoutes() {
    let root = this.topLevelApp || this
    const allApps = bfs(root) || []
    const allRoutes = allApps.flatMap((x) => {
      const prefix = this.joinBasePaths(
        this.getAppAndParents(x).map((x) => x.basePath),
      )

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
    let bodySchema: TypeSchema = hooks?.request || hooks?.body
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
    const store = this.router.register(path)
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
    this.routes.push(route)
    store[method!] = route
  }

  private match(method: string, path: string) {
    let root = this
    let foundApp: AnySpiceflow | undefined
    // remove trailing slash which can cause problems
    path = path.replace(/\/$/, '') || '/'
    const result = bfsFind(this, (app) => {
      app.topLevelApp = root
      let prefix = this.joinBasePaths(
        this.getAppAndParents(app).map((x) => x.basePath),
      ).replace(/\/$/, '')
      if (prefix && !path.startsWith(prefix)) {
        return
      }
      let pathWithoutPrefix = path
      if (prefix) {
        pathWithoutPrefix = path.replace(prefix, '') || '/'
      }

      const medleyRoute = app.router.find(pathWithoutPrefix)
      if (!medleyRoute) {
        foundApp = app
        return
      }

      let internalRoute: InternalRoute = medleyRoute.store[method]

      if (internalRoute) {
        const params = medleyRoute.params || {}

        const res = {
          app,
          internalRoute: internalRoute,
          params,
        }
        return res
      }
      if (method === 'HEAD') {
        let internalRouteGet: InternalRoute = medleyRoute.store['GET']
        if (!internalRouteGet?.handler) {
          return
        }
        return {
          app,
          internalRoute: {
            hooks: {},
            handler: async (c) => {
              const response = await internalRouteGet.handler(c)
              if (isResponse(response)) {
                return new Response('', {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                })
              }
              return new Response(null, { status: 200 })
            },
            method,
            path,
          } as InternalRoute,
          params: medleyRoute.params,
        }
      }
    })

    return (
      result || {
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
    ClientRoutes,
    RoutePaths
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
      waitUntil?: WaitUntil
      basePath?: BasePath
      disableSuperJsonUnlessRpc?: boolean
    } = {},
  ) {
    this.scoped = options.scoped
    this.disableSuperJsonUnlessRpc = options.disableSuperJsonUnlessRpc || false

    // Set up waitUntil function - use provided one, global one, or noop
    this.waitUntilFn =
      options.waitUntil ||
      (typeof globalThis !== 'undefined' && 'waitUntil' in globalThis
        ? (globalThis as any).waitUntil
        : () => {})

    this.basePath = options.basePath || ''
    if (this.basePath === '/') {
      this.basePath = ''
    }
  }

  post<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          post: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']
            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
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
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          get: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
  > {
    this.add({ method: 'GET', path, handler: handler, hooks: hook })
    return this as any
  }

  put<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          put: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
  > {
    this.add({ method: 'PUT', path, handler: handler, hooks: hook })

    return this as any
  }

  route<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      this,
      Schema,
      Singleton,
      JoinPath<BasePath, Path>
    >,
    Method extends HTTPMethod | HTTPMethod[] = '*',
  >(
    options: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    > & {
      path: Path
      method?: Method
      handler: Handle
    },
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          [M in Method extends readonly (infer E)[]
            ? Lowercase<E & string>
            : Lowercase<Method & string>]: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']
            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
  > {
    // If options.request is defined, disallow for GET and HEAD (methods that don't support a body)
    const methodsWithNoBody = ['GET', 'HEAD']
    const actualMethod = options.method ?? '*'
    const normalizedMethods: string[] = Array.isArray(actualMethod)
      ? actualMethod.flatMap((m) => {
          const method = typeof m === 'string' ? m.toUpperCase() : m
          return method === '*' ? [...METHODS] : [method as string]
        })
      : (() => {
          const method =
            typeof actualMethod === 'string'
              ? actualMethod.toUpperCase()
              : actualMethod
          return method === '*' ? [...METHODS] : [method as string]
        })()
    if (
      options.request &&
      normalizedMethods.some((m) => methodsWithNoBody.includes(m))
    ) {
      throw new Error(
        `Request schema ('request') is not allowed on routes with method GET or HEAD`,
      )
    }
    if (Array.isArray(actualMethod)) {
      actualMethod.map((method) => {
        if (method === '*') {
          for (const m of METHODS) {
            this.add({
              method: m,
              path: options.path,
              handler: options.handler,
              hooks: options,
            })
          }
        } else {
          this.add({
            method,
            path: options.path,
            handler: options.handler,
            hooks: options,
          })
        }
      })
    } else {
      if (actualMethod === '*') {
        for (const method of METHODS) {
          this.add({
            method,
            path: options.path,
            handler: options.handler,
            hooks: options,
          })
        }
      } else {
        this.add({
          method: actualMethod,
          path: options.path,
          handler: options.handler,
          hooks: options,
        })
      }
    }

    return this as any
  }

  patch<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          patch: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
  > {
    this.add({ method: 'PATCH', path, handler: handler, hooks: hook })

    return this as any
  }

  delete<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          delete: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
  > {
    this.add({ method: 'DELETE', path, handler: handler, hooks: hook })

    return this as any
  }

  options<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          options: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
  > {
    this.add({ method: 'OPTIONS', path, handler: handler, hooks: hook })

    return this as any
  }

  all<
    const Path extends string,
    const LocalSchema extends InputSchema<keyof Definitions['type'] & string>,
    const Schema extends UnwrapRoute<LocalSchema, Definitions['type']>,
    const Handle extends InlineHandler<
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          [method in string]: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
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
      this,
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
    ClientRoutes &
      CreateClient<
        JoinPath<BasePath, Path>,
        {
          head: {
            request: GetRequestSchema<Schema>
            params: undefined extends Schema['params']
              ? ResolvePath<Path>
              : Schema['params']
            query: Schema['query']

            response: ComposeSpiceflowResponse<Schema['response'], Handle>
          }
        }
      >,
    RoutePaths | JoinPath<BasePath, Path>
  > {
    this.add({ method: 'HEAD', path, handler: handler, hooks: hook })

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
          ? ClientRoutes & NewSpiceflow['_types']['ClientRoutes']
          : ClientRoutes &
              CreateClient<BasePath, NewSpiceflow['_types']['ClientRoutes']>,
        RoutePaths | NewSpiceflow['_types']['RoutePaths']
      >
  use<const Schema extends RouteSchema>(
    handler: MiddlewareHandler<Schema, Singleton>,
  ): this

  use(appOrHandler) {
    if (appOrHandler instanceof Spiceflow) {
      appOrHandler.topLevelApp = this
      // Inherit disableSuperJsonUnlessRpc from parent if child doesn't have it set
      if (this.disableSuperJsonUnlessRpc === true) {
        appOrHandler.disableSuperJsonUnlessRpc = true
      }
      this.childrenApps.push(appOrHandler)
    } else if (typeof appOrHandler === 'function') {
      this.middlewares ??= []
      this.middlewares.push(appOrHandler)
    }
    return this
  }

  onError<const Schema extends RouteSchema>(
    handler: ErrorHandler<Definitions['error'], Schema, Singleton>,
  ): this {
    this.onErrorHandlers ??= []
    this.onErrorHandlers.push(handler as any)

    return this
  }

  handle = async (
    request: Request,
    { state: customState }: { state?: Singleton['state'] } = {},
  ): Promise<Response> => {
    let u = new URL(request.url, 'http://localhost')
    const self = this
    let path = u.pathname + u.search
    const defaultContext = {
      redirect,
      error: null,
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

    let state = customState || copy(defaultState)

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
    // Wrap waitUntil with error handling
    const wrappedWaitUntil: WaitUntil = (promise: Promise<any>) => {
      const wrappedPromise = promise.catch(async (error) => {
        const spiceflowError: SpiceflowServerError =
          error instanceof Error ? error : new Error(String(error))
        await this.runErrorHandlers({
          context: { ...defaultContext, state, request, path, redirect },
          onErrorHandlers: onErrorHandlers,
          error: spiceflowError,
          request,
        })
      })
      return this.waitUntilFn(wrappedPromise)
    }

    let context = {
      ...defaultContext,
      request,
      state,
      path,
      query: parseQuery((u.search || '').slice(1)),
      params: _params,
      redirect,
      waitUntil: wrappedWaitUntil,
    } satisfies MiddlewareContext<any>
    let handlerResponse: Response | undefined
    async function getResForError(err: any) {
      if (isResponse(err)) return err
      let res = await self.runErrorHandlers({
        context,
        onErrorHandlers,
        error: err,
        request,
      })
      if (isResponse(res)) return res

      let status = err?.status ?? err?.statusCode ?? 500
      // Ensure status is a valid HTTP status code (100-599)
      if (typeof status !== 'number' || status < 100 || status > 599) {
        status = 500
      }
      res ||= new Response(
        self.superjsonSerialize({
          ...err,
          message: err?.message || 'Internal Server Error',
        }, false, request),
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
            return await self.turnHandlerResultIntoResponse(
              result,
              route.internalRoute,
              request,
            )
          }
        }
        if (handlerResponse) {
          return handlerResponse
        }

        context.query = await runValidation(
          context.query,
          route.internalRoute?.validateQuery,
        )
        context.params = await runValidation(
          context.params,
          route.internalRoute?.validateParams,
        )

        const res = await route.internalRoute?.handler.call(this, context)
        if (isAsyncIterable(res)) {
          handlerResponse = await this.handleStream({
            generator: res,
            request,
            onErrorHandlers,
            route: route.internalRoute,
          })
          return handlerResponse
        }
        handlerResponse = await self.turnHandlerResultIntoResponse(
          res,
          route.internalRoute,
          request,
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

  protected superjsonSerialize(value: any, indent = false, request?: Request): string {
    const isRpcRequest = request?.headers.get('x-spiceflow-agent') === 'spiceflow-client'

    // If flag is set and this is not an RPC request, use regular JSON
    if (this.disableSuperJsonUnlessRpc && !isRpcRequest) {
      return JSON.stringify(value, null, indent ? 2 : undefined)
    }

    // Otherwise use superjson
    const { json, meta } = superjson.serialize(value)
    if (json && meta) {
      json['__superjsonMeta'] = meta
    }
    return JSON.stringify(json ?? null, null, indent ? 2 : undefined)
  }

  private async turnHandlerResultIntoResponse(
    result: any,
    route: InternalRoute,
    request?: Request,
  ): Promise<Response> {
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

    return new Response(this.superjsonSerialize(result, false, request), {
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  private async runErrorHandlers({
    context,
    onErrorHandlers = [] as OnError[],
    error: err,
    request,
  }: {
    context: Partial<MiddlewareContext>
    onErrorHandlers?: OnError[]
    error: SpiceflowServerError
    request: Request
  }) {
    if (onErrorHandlers.length === 0) {
      console.error(`Spiceflow unhandled error:`, err)
    } else {
      for (const errHandler of onErrorHandlers) {
        const path = new URL(request.url).pathname
        const res = errHandler({ path, ...context, error: err, request })
        if (isResponse(res)) {
          return res
        }
      }
    }
  }

  private joinBasePaths(basePaths: (string | undefined)[]): string {
    // Filter out empty/undefined paths and remove consecutive duplicates
    const filteredPaths = basePaths
      .filter((path): path is string => path !== undefined && path !== '')
      .filter((path, index, arr) => index === 0 || path !== arr[index - 1])

    // Skip paths that are prefixes of the previous path (parent is prefix of child)
    const result: string[] = []
    for (let i = 0; i < filteredPaths.length; i++) {
      const currentPath = filteredPaths[i]
      const previousPath = result[result.length - 1]

      // Skip if the previous path is a prefix of the current path
      if (previousPath && currentPath.startsWith(previousPath)) {
        // Replace the previous path with the current path (which is longer)
        result[result.length - 1] = currentPath
      } else {
        result.push(currentPath)
      }
    }

    return result.join('')
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
    const app = this
    if (typeof Bun !== 'undefined') {
      const server = Bun.serve({
        port,
        development: (Bun.env.NODE_ENV ?? Bun.env.ENV) !== 'production',
        hostname,
        reusePort: true,
        error(error) {
          console.error(error)
          return new Response(
            app.superjsonSerialize({ message: 'Internal Server Error' }),
            {
              status: 500,
            },
          )
        },
        async fetch(request) {
          const res = await app.handle(request)
          return res
        },
      })

      process.on('beforeExit', () => {
        server.stop()
      })

      const displayedHost =
        server.hostname === '0.0.0.0' ? 'localhost' : server.hostname
      console.log(`Listening on http://${displayedHost}:${server.port}`)

      return { port: server.port, server }
    }

    return this.listenForNode(port, hostname)
  }

  /**
   * @deprecated Use `handleForNode` instead.
   */
  async handleNode(
    req: IncomingMessage,
    res: ServerResponse,
    context: { state?: Singleton['state'] } = {},
  ) {
    return this.handleForNode(req, res, context)
  }

  handleForNode = (
    req: IncomingMessage,
    res: ServerResponse,
    context: { state?: Singleton['state'] } = {},
  ) => {
    return handleForNode(this, req, res, context)
  }

  /* @deprecated */
  async listenForNode(port: number, hostname: string = '0.0.0.0') {
    if (typeof Bun !== 'undefined') {
      console.warn(
        "Server is being started with node:http but the current runtime is Bun, not Node. Consider using the method 'handle' with 'Bun.serve' instead.",
      )
    }
    return listenForNode(this, port, hostname)
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
      return new Response(
        'event: message\ndata: ' +
          this.superjsonSerialize(init.value, false, request) +
          '\n\n' +
          'event: done\n\n',
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            // fix for fly.io streaming
            // https://github.com/vercel/next.js/issues/9965#issuecomment-584319868
            'content-encoding': 'none',
          },
        },
      )
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
                  self.superjsonSerialize(init.value, false, request) +
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
                    self.superjsonSerialize(chunk, false, request) +
                    '\n\n',
                ),
              )
            }
          } catch (error: any) {
            let res = await self.runErrorHandlers({
              context: {},
              onErrorHandlers: onErrorHandlers,
              error,
              request,
            })
            controller.enqueue(
              Buffer.from(
                'event: error\ndata: ' +
                  self.superjsonSerialize(
                    {
                      ...error,
                      message: error.message || error.name || 'Error',
                    },
                    false,
                    request
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
          // fix for fly.io streaming
          // https://github.com/vercel/next.js/issues/9965#issuecomment-584319868
          'content-encoding': 'none',
          'cache-control': 'no-cache',
        },
      },
    )
  }
  safePath<
    const Path extends RoutePaths,
    const Params extends ExtractParamsFromPath<Path>,
  >(
    path: Path,
    ...rest: [Params] extends [undefined]
      ? [] | [params?: Params]
      : [params: Params]
  ): string {
    let params = (rest.length > 0 ? rest[0] : undefined) as Params | undefined
    let result = path as string

    // Handle all provided parameters
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (key === '*') {
          // Replace wildcard
          result = result.replace(/\*/, String(value))
        } else {
          // Replace named parameters as before
          const regex = new RegExp(`:${key}`, 'g')
          result = result.replace(regex, String(value))
        }
      })
    }

    return result
  }
}

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
  validateBody?: ValidationFunction

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


export type AnySpiceflow = Spiceflow<any, any, any, any, any, any, any>

export function isZodSchema(value: unknown): value is ZodType {
  return (
    value instanceof ZodType ||
    (typeof value === 'object' &&
      value !== null &&
      'parse' in value &&
      'safeParse' in value &&
      'optional' in value &&
      'nullable' in value)
  )
}

import type * as z4 from 'zod/v4/core'

/** `true` ⇒ the value was created by Zod 4, `false` ⇒ Zod 3 */
export function isZod4(schema: any): schema is z4.$ZodObject {
  return '_zod' in schema // ⇦ only v4 adds this marker
}

function getValidateFunction(
  schema: TypeSchema,
): ValidationFunction | undefined {
  if (!schema) {
    return
  }
  try {
    return schema['~standard'].validate
  } catch (error) {
    console.log(`not a standard schema: ${schema}`)
    return undefined
  }
}

async function runValidation(value: any, validate?: ValidationFunction) {
  if (!validate) return value

  let result = validate(value)
  if (result instanceof Promise) {
    result = await result
  }

  if (result.issues && result.issues.length > 0) {
    const errorMessages = result.issues
      .map((issue) => {
        let pathString = ''
        if (issue.path && issue.path.length > 0) {
          pathString = issue.path.join('.') + ': '
        }
        return pathString + issue.message
      })
      .join('\\n')
    throw new ValidationError(errorMessages || 'Validation failed')
  }
  if ('value' in result) {
    return result.value
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

export function cloneDeep(x) {
  return copy(x)
}
