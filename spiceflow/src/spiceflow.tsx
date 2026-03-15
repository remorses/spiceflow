import type { ReactFormState } from 'react-dom/client'

import { copy } from 'copy-anything'
import superjson from 'superjson'

import { SpiceflowFetchError } from './client/errors.js'
import { ValidationError } from './error.js'
import {
  ComposeSpiceflowResponse,
  CreateClient,
  DefinitionBase,
  ErrorHandler,
  ExtractParamsFromPath,
  GetRequestSchema,
  HTTPMethod,
  ValidationFunction,
  InlineHandler,
  InputSchema,
  InternalRoute,
  IsAny,
  JoinPath,
  LocalHook,
  MetadataBase,
  MiddlewareHandler,
  NodeKind,
  Reconcile,
  ResolvePath,
  RouteBase,
  RouteSchema,
  SingletonBase,
  TypeSchema,
  UnwrapRoute,
} from './types.js'

import React, { createElement } from 'react'
import { ZodType } from 'zod'
import { isAsyncIterable, isResponse, isTruthy, redirect } from './utils.js'

import {
  FlightData,
  LayoutContent,
} from './react/components.js'
import {
  getErrorContext,
  isNotFoundError,
  isRedirectError,
} from './react/errors.js'
import {
  createDeploymentCookie,
  deploymentMismatchStatus,
  deploymentReasonHeader,
  deploymentReloadHeader,
  getDocumentPath,
  isDocumentRequest,
  isRscRequest,
  readDeploymentCookie,
} from './react/deployment.js'
import { getRuntimeDeploymentId } from './react/deployment-id.js'
import { TrieRouter } from './trie-router/router.js'
import { decodeURIComponent_ } from './trie-router/url.js'
import { Result } from './trie-router/utils.js'

import { StandardSchemaV1 } from '@standard-schema/spec'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleForNode, listenForNode } from './_node-server.js'
import { renderSsr } from 'spiceflow/handle-ssr'
import { SpiceflowContext, MiddlewareContext } from './context.js'
import { isStaticMiddleware } from './static.js'

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
  const in out RouteQuerySchemas extends object = {},
> {
  private id: number = globalIndex++
  private router: TrieRouter<InternalRoute> = new TrieRouter()
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
    RouteQuerySchemas: {} as RouteQuerySchemas,
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
  private usedIds = new Set<string>()

  private generateRouteId(
    kind: NodeKind | undefined,
    method: string,
    path: string,
  ): string {
    const prefix = kind ? kind : 'api'
    const base = `${prefix}-${method.toLowerCase()}-${path.replace(/\//g, '-')}`
    let id = base
    let counter = 1

    while (this.usedIds.has(id)) {
      id = `${base}-${counter}`
      counter++
    }

    this.usedIds.add(id)
    return id
  }

  private add({
    method,
    path,
    hooks,
    handler,
    ...rest
  }: {
    method?: HTTPMethod
    path?: string
    hooks?: InternalRoute['hooks']
    handler?: InternalRoute['handler']
    kind?: InternalRoute['kind']
    [key: string]: unknown
  }) {
    const kind = rest.kind
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

    const id = this.generateRouteId(kind, method || '', path)

    let route: InternalRoute = {
      ...rest,
      id,
      type: hooks?.type || '',
      method: (method || '') as any,
      path: path || '',
      handler: handler!,
      hooks,
      validateBody,
      validateParams,
      validateQuery,
      kind,
    }
    this.router.add(method!, path, route)

    this.routes.push(route)
  }

  private getAllDecodedParams(
    _matchResult: Result<InternalRoute>,
    pathname: string,
    routeIndex,
  ): Record<string, string> {
    if (!_matchResult?.length || !_matchResult?.[0]?.[routeIndex]?.[1]) {
      return {}
    }

    const matches = _matchResult[0]
    const internalRoute = matches[routeIndex][0]

    const decoded: Record<string, string> =
      extractWildcardParam(pathname, internalRoute?.path) || {}

    const keys = Object.keys(matches[routeIndex][1])
    for (const key of keys) {
      const value = matches[routeIndex][1][key]
      if (value) {
        decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value
      }
    }

    return decoded
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
        pathWithoutPrefix = path.slice(prefix.length) || '/'
      }

      const matchedRoutesForMethod = app.router.match(method, pathWithoutPrefix)
      const matchedRoutes = matchedRoutesForMethod?.length
        ? matchedRoutesForMethod
        : method === 'HEAD'
          ? app.router.match('GET', pathWithoutPrefix)
          : undefined
      if (!matchedRoutes?.length) {
        foundApp = app
        return
      }

      // Get all matched routes
        const routes = matchedRoutes[0].map(([route, params], index) => ({
          app,
          route,
          params: this.getAllDecodedParams(matchedRoutes, pathWithoutPrefix, index),
        }))

      if (routes.length) {
        return routes
      }
    })

    return (
      result || [
        {
          app: foundApp || root,
          route: {
            hooks: {},
            handler: notFoundHandler,
            method,
            path,
          } as InternalRoute,
          params: {},
        },
      ]
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
    RoutePaths,
    RouteQuerySchemas
  > {
    this.defaultState[name] = value
    return this as any
  }

  /**
   * Create a new Router
   * @param options {@link RouterOptions} {@link Platform}
   */
  // Trusted origins for server action POST requests. Strings are compared with exact match,
  // RegExp patterns are tested against the Origin header. Used by the CSRF check in renderReact.
  allowedActionOrigins?: (string | RegExp)[]

  constructor(
    options: {
      name?: string
      scoped?: Scoped
      waitUntil?: WaitUntil
      basePath?: BasePath
      disableSuperJsonUnlessRpc?: boolean
      allowedActionOrigins?: (string | RegExp)[]
    } = {},
  ) {
    this.scoped = options.scoped
    this.disableSuperJsonUnlessRpc = options.disableSuperJsonUnlessRpc || false
    this.allowedActionOrigins = options.allowedActionOrigins

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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
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
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
  > {
    this.add({ method: 'HEAD', path, handler: handler, hooks: hook })

    return this as any
  }

  page<
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
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    ClientRoutes,
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas
  >
  page<
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
    options: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    > & {
      path: Path
      handler: Handle
    },
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    ClientRoutes,
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
  >
  page(pathOrOptions: any, handler?: any) {
    const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path
    const h = typeof pathOrOptions === 'string' ? handler : pathOrOptions.handler
    const hooks = typeof pathOrOptions === 'string' ? undefined : pathOrOptions

    const routeConfig = {
      path,
      handler: h,
      kind: 'page' as const,
      hooks,
    }
    this.add({ ...routeConfig, method: 'GET' })
    this.add({ ...routeConfig, method: 'POST' })
    return this as any
  }
  staticPage<
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
    handler?: Handle,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    ClientRoutes,
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas
  >
  staticPage<
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
    options: LocalHook<
      LocalSchema,
      Schema,
      Singleton,
      Definitions['error'],
      Metadata['macro'],
      JoinPath<BasePath, Path>
    > & {
      path: Path
      handler?: Handle
    },
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    ClientRoutes,
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
  >
  staticPage(pathOrOptions: any, handler?: any) {
    const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path
    const h = typeof pathOrOptions === 'string' ? handler : pathOrOptions.handler
    const hooks = typeof pathOrOptions === 'string' ? undefined : pathOrOptions

    let kind: NodeKind = 'staticPage'
    if (!h) {
      kind = 'staticPageWithoutHandler'
    }
    const routeConfig = {
      path,
      handler: h,
      kind,
      hooks,
    }
    this.add({ ...routeConfig, method: 'GET' })
    return this as any
  }

  layout<
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
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata,
    ClientRoutes,
    RoutePaths,
    RouteQuerySchemas
  > {
    const routeConfig = {
      path,
      handler: handler,

      kind: 'layout' as const,
    }
    this.add({ ...routeConfig, method: 'GET' })
    this.add({ ...routeConfig, method: 'POST' })
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
        RoutePaths | NewSpiceflow['_types']['RoutePaths'],
        RouteQuerySchemas & NewSpiceflow['_types']['RouteQuerySchemas']
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

  async renderReact({
    request,
    reactRoutes,
    context,
  }: {
    request: Request
    context
    reactRoutes: Array<{
      route: InternalRoute
      app: AnySpiceflow
      params: Record<string, string>
    }>
  }) {
    const {
      renderToReadableStream,
      createTemporaryReferenceSet,
      decodeReply,
      decodeAction,
      decodeFormState,
      loadServerAction,
      getAppEntryCssElement,
    } = await import('virtual:bundler-adapter/server')

    const [pageRoutes, layoutRoutes] = partition(
      reactRoutes,
      (x) => x.route.kind === 'page' || x.route.kind === 'staticPage',
    )
    const pageRoute = pickBestRoute(pageRoutes)
    if (!pageRoute) {
      return new Response('Not Found', { status: 404 })
    }

    let Page = pageRoute?.route?.handler as any
    let page = (
      <Page
        {...{
          ...context,
          params: pageRoute.params,
        }}
      />
    )
    const layouts = layoutRoutes
      .map((layout) => {
        if (layout.route.kind !== 'layout') return
        const id = layout.route.id
        const children = createElement(LayoutContent, { id })

        let Layout = layout.route.handler as any
        const element = (
          <Layout
            {...{
              ...context,
              params: layout.params,
              children,
            }}
          />
        )
        return { element, id }
      })
      .filter(isTruthy)

    let root: FlightData = {
      page,
      layouts,
      globalCss: getAppEntryCssElement(),
    }
    let actionError: Error | undefined
    let returnValue: unknown | undefined
    let formState: ReactFormState | undefined
    // Tracks non-serializable values (DOM nodes, React elements) across action encode/decode.
    // One set per request, shared between decodeReply and renderToReadableStream.
    let temporaryReferences: ReturnType<typeof createTemporaryReferenceSet> | undefined
    if (request.method === 'POST') {
      // CSRF protection: validate that the Origin header matches the request URL origin.
      // Must run before the try/catch so a 403 is returned directly, not swallowed into actionError.
      const origin = request.headers.get('Origin')
      if (origin) {
        const requestUrl = new URL(request.url)
        const root = this.topLevelApp || this
        const allowed = root.allowedActionOrigins
        const isAllowed =
          origin === requestUrl.origin ||
          allowed?.some((rule) =>
            rule instanceof RegExp ? rule.test(origin) : origin === rule,
          )
        if (!isAllowed) {
          return new Response('Forbidden: origin mismatch', { status: 403 })
        }
      }
      try {
        const url = new URL(request.url)
        const actionId = url.searchParams.get('__rsc')
        if (actionId) {
          temporaryReferences = createTemporaryReferenceSet()
          const contentType = request.headers.get('content-type')
          const body = contentType?.startsWith('multipart/form-data')
            ? await request.formData()
            : await request.text()
          const args = await decodeReply(body, { temporaryReferences })
          const action = await loadServerAction(actionId)
          returnValue = await (action as any).apply(null, args)
        } else {
          // progressive enhancement (form POST without JS)
          const formData = await request.formData()
          const decodedAction = await decodeAction(formData)
          formState = await decodeFormState(
            await decodedAction(),
            formData,
          )
        }
      } catch (e) {
        console.log('action error', e)
        actionError = e
      }
    }

    if (root instanceof Response) {
      return root
    }

    const stream = renderToReadableStream<ServerPayload>(
      {
        root,
        returnValue,
        formState,
        actionError,
      } satisfies ServerPayload,
      {
        // Pass the same temporaryReferences used in decodeReply so non-serializable
        // values round-trip correctly through the action response stream.
        temporaryReferences,
        onPostpone(reason) {
          console.log(`POSTPONE`, reason)
        },
        onError(error) {
          console.error('[spiceflow:renderToReadableStream]', error)
          return error?.digest || error?.message
        },
        signal: request.signal,
      },
    )

    return new Response(stream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
      },
    })
  }

  handle = async (
    request: Request,
    { state: customState }: { state?: Singleton['state'] } = {},
  ): Promise<Response> => {
    let u = new URL(request.url, 'http://localhost')
    request =
      request instanceof SpiceflowRequest ? request : new SpiceflowRequest(u, request)
    const self = this
    const shouldUseDeploymentId =
      isDocumentRequest(request) || isRscRequest(u)
    const deploymentId = shouldUseDeploymentId
      ? await getRuntimeDeploymentId()
      : undefined
    // Strip .rsc suffix before route matching — the client appends it for RSC data fetches,
    // but routes are registered without it. Without this, dynamic params like :id get corrupted
    // (e.g. { 'id.rsc': '121.rsc' } instead of { id: '121' }).
    let path = u.pathname
    if (path.endsWith('.rsc')) {
      path = path.slice(0, -4)
    }
    let onErrorHandlers: OnError[] = []

    // Wrap waitUntil with error handling
    const wrappedWaitUntil: WaitUntil = (promise: Promise<any>) => {
      const wrappedPromise = promise.catch(async (error) => {
        const spiceflowError: SpiceflowServerError =
          error instanceof Error ? error : new Error(String(error))
        await this.runErrorHandlers({
          context,
          onErrorHandlers,
          error: spiceflowError,
          request,
        })
      })
      return this.waitUntilFn(wrappedPromise)
    }

    const context = {
      redirect,
      state: customState || cloneDeep(this.defaultState),
      query: parseQuery((u.search || '').slice(1)),
      request,
      path,
      params: {},
      waitUntil: wrappedWaitUntil,
    }
    const root = this.topLevelApp || this
    const requestDeploymentId = deploymentId
      ? readDeploymentCookie(request)
      : undefined

    if (
      deploymentId &&
      requestDeploymentId &&
      deploymentId !== requestDeploymentId &&
      isRscRequest(u)
    ) {
      return new Response(null, {
        status: deploymentMismatchStatus,
        headers: {
          [deploymentReasonHeader]: 'deployment-mismatch',
          [deploymentReloadHeader]: getDocumentPath(u),
          'set-cookie': createDeploymentCookie({
            deploymentId,
            basePath: root.basePath,
          }),
        },
      })
    }

    const finalizeResponse = ({
      response,
      stripBody,
    }: {
      response: Response
      stripBody: boolean
    }) => {
      const finalized = this.finalizeHeadResponse({ response, stripBody, request })
      if (
        !deploymentId ||
        !isDocumentRequest(request) ||
        requestDeploymentId === deploymentId
      ) {
        return finalized
      }

      const headers = new Headers(finalized.headers)
      headers.append(
        'set-cookie',
        createDeploymentCookie({
          deploymentId,
          basePath: root.basePath,
        }),
      )

      return new Response(finalized.body, {
        status: finalized.status,
        statusText: finalized.statusText,
        headers,
      })
    }

    let routes = this.match(request.method, path)
    if (
      request.method === 'HEAD' &&
      routes.length === 1 &&
      routes[0]?.route?.handler === notFoundHandler
    ) {
      routes = this.match('GET', path)
    }
    const shouldStripHeadBody =
      request.method === 'HEAD' &&
      routes.every((matchedRoute) => matchedRoute.route.method !== 'HEAD')

    const [nonReactRoutes, reactRoutes] = partition(
      routes,
      (x) => !x.route.kind,
    )
    let index = 0
    if (reactRoutes.length) {
      const appsInScope = this.getAppsInScope(reactRoutes[0].app)
      onErrorHandlers = appsInScope.flatMap((x) => x.onErrorHandlers)
      const middlewares = appsInScope.flatMap((x) => x.middlewares)
      let handlerResponse: Response | undefined

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
              return await this.turnHandlerResultIntoResponse(result, undefined, request)
            }
          }
          if (handlerResponse) {
            return handlerResponse
          }

          const res = await this.renderReact({
            request,
            context,
            reactRoutes,
          })

          return res
        } catch (err) {
          handlerResponse = await getResForError(err)
          return await next()
        }
      }
      let response = await next()

      if (
        renderSsr &&
        !isRscRequest(u) &&
        response.headers.get('content-type')?.startsWith('text/x-component')
      ) {
        response = await renderSsr(response, request)
      }

      return finalizeResponse({
        response,
        stripBody: shouldStripHeadBody,
      })
    }
    const route = pickBestRoute(nonReactRoutes)

    // TODO get all apps in scope? layouts can match between apps when using .use?
    const appsInScope = this.getAppsInScope(route.app)
    onErrorHandlers = appsInScope.flatMap((x) => x.onErrorHandlers)
    const scopedMiddlewares = appsInScope.flatMap((x) => x.middlewares)
    const middlewares = scopedMiddlewares.filter((x) => !isStaticMiddleware(x))
    const staticMiddlewares = scopedMiddlewares.filter((x) => isStaticMiddleware(x))
    let { params: _params } = route

    let content = route?.route?.hooks?.content

    if (route?.route?.validateBody && request instanceof SpiceflowRequest) {
      request.validateBody = route?.route?.validateBody
    }

    context['params'] = _params

    let handlerResponse: Response | undefined
    async function getResForError(err: any) {
      const errCtx = getErrorContext(err)
      const redirectInfo = isRedirectError(errCtx)
      if (redirectInfo) {
        return new Response(redirectInfo.location, {
          status: errCtx!.status,
          headers: errCtx!.headers,
        })
      }
      if (isNotFoundError(errCtx)) {
        return new Response(JSON.stringify('not found'), {
          status: 404,
        })
      }
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

    const shouldTryStatic = routeShouldYieldToStatic(route.route)
    const middlewareChain = shouldTryStatic
      ? [...middlewares, ...staticMiddlewares]
      : middlewares

    const next = async () => {
      try {
        if (index < middlewareChain.length) {
          const middleware = middlewareChain[index]
          index++

          const result = await middleware(context, next)
          if (isResponse(result)) {
            handlerResponse = result
          }
          if (!result && index < middlewareChain.length) {
            return await next()
          } else if (result) {
            return await self.turnHandlerResultIntoResponse(result, route?.route, request)
          }
        }
        if (handlerResponse) {
          return handlerResponse
        }

        context.query = await runValidation(
          context.query,
          route?.route?.validateQuery,
        )
        context.params = await runValidation(
          context.params,
          route?.route?.validateParams,
        )

        const res = await route?.route?.handler.call(self, context)
        if (isAsyncIterable(res)) {
          handlerResponse = await this.handleStream({
            generator: res,
            request,
            onErrorHandlers,
            route: route?.route,
          })
          return handlerResponse
        }
        handlerResponse = await self.turnHandlerResultIntoResponse(res, route?.route, request)
        return handlerResponse
      } catch (err) {
        handlerResponse = await getResForError(err)
        return await next()
      }
    }
    const response = await next()

    return finalizeResponse({ response, stripBody: shouldStripHeadBody })
  }

  private finalizeHeadResponse({
    response,
    stripBody,
    request,
  }: {
    response: Response
    stripBody: boolean
    request?: Request
  }) {
    // per HTTP spec, HEAD responses must never include a body
    if (!stripBody && request?.method !== 'HEAD') {
      return response
    }

    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    })
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
    route?: InternalRoute,
    request?: Request,
  ): Promise<Response> {
    // if user returns a promise, await it
    if (result instanceof Promise) {
      result = await result
    }

    if (isResponse(result)) {
      return result
    }

    if (route?.type) {
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
        const reqUrl = new URL(request.url)
        const path = reqUrl.pathname + reqUrl.search
        const res = errHandler({ ...context, path, error: err, request })
        if (isResponse(res)) {
          return res
        }
        const errCtx = getErrorContext(err)
        const redirectInfo = isRedirectError(errCtx)
        if (redirectInfo) {
          return new Response(redirectInfo.location, {
            status: errCtx!.status,
            headers: errCtx!.headers,
          })
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
    const handler = this.handle.bind(this)
    if (typeof Bun !== 'undefined') {
      const app = this
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
        fetch: handler,
      })

      process.on('beforeExit', () => {
        server.stop()
      })

      const displayedHost =
        server.hostname === '0.0.0.0' ? 'localhost' : server.hostname
      console.log(`Listening on http://${displayedHost}:${server.port}`)

      return { port: server.port, server }
    }

    return listenForNode(handler, port, hostname)
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
    return listenForNode((request) => this.handle(request), port, hostname)
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
      ? Path extends keyof RouteQuerySchemas
        ? unknown extends RouteQuerySchemas[Path]
          ? [] | [allParams?: Record<string, string | number | boolean>]
          : [] | [allParams?: Partial<RouteQuerySchemas[Path]>]
        : [] | [allParams?: Record<string, string | number | boolean>]
      : Path extends keyof RouteQuerySchemas
        ? unknown extends RouteQuerySchemas[Path]
          ? [allParams: Params & Record<string, string | number | boolean>]
          : [allParams: MergeParamsAndQuery<Params, RouteQuerySchemas[Path]>]
        : [allParams: Params] | [allParams: Params & Record<string, string | number | boolean>]
  ): string {
    return buildSafePath(path, rest[0] as Record<string, any> | undefined)
  }
}

type MergeParamsAndQuery<P, Q> = [P] extends [undefined]
  ? Partial<Q>
  : P & Omit<Partial<Q>, keyof P>

function buildSafePath(path: string, allParams: Record<string, any> | undefined): string {
  let result = path
  if (!allParams || typeof allParams !== 'object') return result

  const pathParamNames = new Set<string>()
  const paramMatches = path.matchAll(/:(\w+)/g)
  for (const m of paramMatches) {
    pathParamNames.add(m[1])
  }
  const hasWildcard = path.includes('*')
  if (hasWildcard) pathParamNames.add('*')

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(allParams)) {
    if (value === undefined || value === null) continue
    if (key === '*' && hasWildcard) {
      result = result.replace(/\*/, String(value))
    } else if (pathParamNames.has(key)) {
      result = result.replace(new RegExp(`:${key}`, 'g'), String(value))
    } else {
      searchParams.set(key, String(value))
    }
  }

  const qs = searchParams.toString()
  if (qs) result += '?' + qs
  return result
}

/**
 * Create a standalone type-safe path builder. Pass your app instance for automatic
 * type inference, or call with explicit type params. The app value is not used at runtime.
 *
 * ```ts
 * const app = new Spiceflow()
 *   .get('/users/:id', handler, { query: z.object({ page: z.number() }) })
 *
 * const safePath = createSafePath(app)
 * safePath('/users/:id', { id: '123', page: 1 })
 * ```
 */
export function createSafePath<
  T extends { _types: { RoutePaths: string; RouteQuerySchemas: object } },
>(
  _app?: T,
) {
  type Paths = T['_types']['RoutePaths']
  type QS = T['_types']['RouteQuerySchemas']
  return <
    const Path extends Paths,
    const Params extends ExtractParamsFromPath<Path> = ExtractParamsFromPath<Path>,
  >(
    path: Path,
    ...rest: [Params] extends [undefined]
      ? Path extends keyof QS
        ? unknown extends QS[Path]
          ? [] | [allParams?: Record<string, string | number | boolean>]
          : [] | [allParams?: Partial<QS[Path]>]
        : [] | [allParams?: Record<string, string | number | boolean>]
      : Path extends keyof QS
        ? unknown extends QS[Path]
          ? [allParams: Params & Record<string, string | number | boolean>]
          : [allParams: MergeParamsAndQuery<Params, QS[Path]>]
        : [allParams: Params] | [allParams: Params & Record<string, string | number | boolean>]
  ): string => {
    return buildSafePath(path, rest[0] as Record<string, any> | undefined)
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
  private textPromise?: Promise<string>
  private jsonPromise?: Promise<T>

  async text(): Promise<string> {
    this.textPromise ??= super.text()
    return this.textPromise
  }

  async json(): Promise<T> {
    this.jsonPromise ??= this.text().then(async (text) => {
      const body = JSON.parse(text) as T
      return runValidation(body, this.validateBody)
    })
    return this.jsonPromise
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

export type AnySpiceflow = Spiceflow<any, any, any, any, any, any, any, any>

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
    if (Object.prototype.hasOwnProperty.call(paramsObject, key)) {
      paramsObject[key] = Array.isArray(paramsObject[key])
        ? [...paramsObject[key], value]
        : [paramsObject[key], value]
    } else {
      paramsObject[key] = value // Set the value if it's the first occurrence
    }
  }
  return paramsObject
}

// TODO support things after *, like /files/*/path/to/file.txt
export function extractWildcardParam(
  url: string,
  patternUrl: string,
): { '*'?: string } | null {
  // Check if pattern contains wildcard
  if (!patternUrl.includes('*')) {
    return null
  }

  // Split pattern and url into segments
  const patternParts = patternUrl.split('/').filter(Boolean)
  const urlParts = url.split('/').filter(Boolean)

  // Find wildcard index in pattern
  const wildcardIndex = patternParts.indexOf('*')
  if (wildcardIndex === -1) {
    return null
  }

  const suffixLength = patternParts.length - wildcardIndex - 1
  const endIndex = suffixLength > 0 ? urlParts.length - suffixLength : urlParts.length
  const wildcardSegments = urlParts.slice(wildcardIndex, endIndex)
  if (!wildcardSegments.length) {
    return null
  }

  // Join segments with / to get full wildcard path
  return {
    '*': wildcardSegments.join('/'),
  }
}

export function cloneDeep(x) {
  return copy(x)
}

function getRouteSpecificity(route: InternalRoute) {
  const parts = route.path.split('/').filter(Boolean)
  const wildcardCount = parts.filter((p) => p === '*').length
  const regexParamCount = parts.filter((p) => /^:[^{}]+\{.+\}$/.test(p)).length
  const namedParamCount = parts.filter(
    (p) => p.startsWith(':') && !/^:[^{}]+\{.+\}$/.test(p),
  ).length
  const staticSegmentCount = parts.length - wildcardCount - regexParamCount - namedParamCount
  const segmentCount = parts.length
  return {
    wildcardCount,
    namedParamCount,
    regexParamCount,
    staticSegmentCount,
    segmentCount,
  }
}

function pickBestRoute<T extends { route: InternalRoute }>(routes: T[]): T {
  if (routes.length <= 1) return routes[0]
  let best = routes[0]
  let bestSpec = getRouteSpecificity(best.route)
  for (let i = 1; i < routes.length; i++) {
    const spec = getRouteSpecificity(routes[i].route)
    // 1. Fewer wildcards wins (static/named > wildcard)
    if (spec.wildcardCount < bestSpec.wildcardCount) {
      best = routes[i]
      bestSpec = spec
      continue
    }
    if (spec.wildcardCount > bestSpec.wildcardCount) continue
    // 2. More static segments wins
    if (spec.staticSegmentCount > bestSpec.staticSegmentCount) {
      best = routes[i]
      bestSpec = spec
      continue
    }
    if (spec.staticSegmentCount < bestSpec.staticSegmentCount) continue
    // 3. More regex params wins (regex > generic param)
    if (spec.regexParamCount > bestSpec.regexParamCount) {
      best = routes[i]
      bestSpec = spec
      continue
    }
    if (spec.regexParamCount < bestSpec.regexParamCount) continue
    // 4. Fewer plain named params wins (static and regex > :param)
    if (spec.namedParamCount < bestSpec.namedParamCount) {
      best = routes[i]
      bestSpec = spec
      continue
    }
    if (spec.namedParamCount > bestSpec.namedParamCount) continue
    // 5. More segments wins (longer match)
    if (spec.segmentCount > bestSpec.segmentCount) {
      best = routes[i]
      bestSpec = spec
      continue
    }
    if (spec.segmentCount < bestSpec.segmentCount) continue
    // 6. Same pattern shape: last registered wins (override)
    best = routes[i]
    bestSpec = spec
  }
  return best
}

function routeShouldYieldToStatic(route: InternalRoute) {
  return route.handler === notFoundHandler || route.path === '/*' || route.path === '*'
}

function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  return arr.reduce(
    (acc, item) => {
      acc[predicate(item) ? 0 : 1].push(item)
      return acc
    },
    [[], []] as [T[], T[]],
  )
}

export interface ServerPayload {
  root: FlightData
  formState?: ReactFormState
  returnValue?: unknown
  actionError?: Error
}
