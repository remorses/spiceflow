import type { ReactFormState } from 'react-dom/client'

import { copy } from './copy-anything.js'
import superjson from 'superjson'
import * as errore from 'errore'

import { SpiceflowFetchError } from './client/errors.js'
import { actionRequestStorage } from './action-context.js'
import { createRouterContextData, routerContextStorage } from './router-context.js'
import { coerceQueryWithSchema } from './query-coerce.js'
import { ValidationError } from './error.js'
import {
  ComposeSpiceflowResponse,
  CreateClient,
  DefinitionBase,
  ErrorHandler,
  AllHrefPaths,
  ExtractParamsFromPath,
  HrefArgs,
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
  PrefixPaths,
  PrefixQuerySchemas,
  PrefixLoaderData,
} from './types.js'
import { buildHref } from './react/loader-utils.js'

import React, { createElement } from 'react'
import { ZodType } from 'zod'
import { isAsyncIterable, isResponse, isTruthy, redirect } from './utils.js'

import {
  DefaultNotFoundPage,
  FlightData,
  LayoutContent,
} from './react/components.js'
import { CollectedHead } from './react/head.js'
import {
  getErrorContext,
  isNotFoundError,
  isRedirectError,
  isRedirectStatus,
  contextToHeaders,
} from './react/errors.js'
import { formatServerError } from './react/format-server-error.js'
import { sanitizeErrorMessage } from './react/sanitize-error.js'
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
import { getDeploymentId } from '#deployment-id'
import {
  createTemporaryReferenceSet,
  decodeAction,
  decodeFormState,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '#rsc-runtime'

const verboseLogs = process.env.SPICEFLOW_VERBOSE === '1'
import { TrieRouter } from './trie-router/router.js'
import { decodeURIComponent_ } from './trie-router/url.js'
import { Result } from './trie-router/utils.js'

import type { StandardSchemaV1 } from './standard-schema.js'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleForNode, listenForNode } from '#node-server'
import { renderSsr } from '#handle-ssr'
import {
  SpiceflowContext,
  MiddlewareContext,
  ContextResponse,
} from './context.js'
import { isStaticMiddleware } from './static.js'
import {
  type SpiceflowTracer,
  type SpiceflowSpan,
  withSpan,
  recordError,
  finalizeRequestSpan,
  SPAN_KIND_SERVER,
  ATTR,
  noopSpan,
  noopTracer,
} from './instrumentation.js'

let globalIndex = 0

const spiceflowReportedErrors = new WeakMap<Request, Set<string>>()

function getErrorReportKey(error: unknown) {
  if (!(error instanceof Error)) return String(error)

  const digest = Reflect.get(error, 'digest')
  const status = Reflect.get(error, 'status')

  return `${error.name}:${error.message}:${typeof digest === 'string' ? digest : ''}:${typeof status === 'number' ? status : ''}`
}

function getReportedErrorKeys(request: Request) {
  const reportedErrors = spiceflowReportedErrors.get(request)
  if (reportedErrors) return reportedErrors

  const next = new Set<string>()
  spiceflowReportedErrors.set(request, next)
  return next
}

type AsyncResponse = Response | Promise<Response>

export type SpiceflowListenResult =
  | {
      port: number | undefined
      server: Bun.Server
      stop: () => Promise<void>
    }
  | {
      port: number
      server: unknown
      stop: () => Promise<void>
    }
  | {
      port: undefined
      server: undefined
      stop: () => Promise<void>
    }

async function noopStop() {}

function createNoopListenResult(): SpiceflowListenResult {
  return {
    port: undefined,
    server: undefined,
    stop: noopStop,
  }
}

function appendHeaders(target: Headers, source: Headers) {
  let changed = false
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] })
    .getSetCookie
  const setCookies = getSetCookie?.call(source) ?? []

  for (const cookie of setCookies) {
    target.append('set-cookie', cookie)
    changed = true
  }

  for (const [key, value] of source.entries()) {
    if (key.toLowerCase() === 'set-cookie' && setCookies.length > 0) continue
    if (key.toLowerCase() === 'set-cookie') {
      target.append(key, value)
    } else {
      target.set(key, value)
    }
    changed = true
  }

  return changed
}

function mergeHeadersIntoResponse({
  response,
  source,
}: {
  response: Response
  source?: Headers
}) {
  if (!source) {
    return response
  }

  const headers = new Headers(response.headers)
  if (!appendHeaders(headers, source)) {
    return response
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

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

type MatchedRoute = {
  app: AnySpiceflow
  route: InternalRoute
  params: Record<string, string>
}

const notFoundHandler = (c) => {
  return new Response('Not Found', { status: 404 })
}

function createContextResponse(): ContextResponse {
  return {
    headers: new Headers(),
    status: 200,
  }
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
    loaderData: {}
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
  private disableSuperJsonUnlessRpc: boolean = true
  tracer?: SpiceflowTracer

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

      return x.routes.map((x) => {
        const joined = prefix + x.path
        // Normalize: strip trailing slash (same as match() and add()) but keep bare '/'
        const path = joined.replace(/\/$/, '') || '/'
        return { ...x, path }
      })
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

    // Collect matched routes from all apps so that more-specific child
    // routes are visible even when a less-specific parent route also matches.
    const allRoutes: MatchedRoute[] = []
    const allApps = bfs(this)
    for (const app of allApps) {
      app.topLevelApp = root
      let prefix = this.joinBasePaths(
        this.getAppAndParents(app).map((x) => x.basePath),
      ).replace(/\/$/, '')
      if (prefix && !path.startsWith(prefix)) {
        continue
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
        continue
      }

      // Get all matched routes from this app
      const routes = matchedRoutes[0].map(([route, params], index) => ({
        app,
        route,
        params: this.getAllDecodedParams(
          matchedRoutes,
          pathWithoutPrefix,
          index,
        ),
      }))

      allRoutes.push(...routes)
    }

    return allRoutes.length
      ? allRoutes
      : [
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
      tracer?: SpiceflowTracer
    } = {},
  ) {
    this.scoped = options.scoped
    this.disableSuperJsonUnlessRpc = options.disableSuperJsonUnlessRpc ?? true
    this.allowedActionOrigins = options.allowedActionOrigins
    this.tracer = options.tracer

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
          return method === '*' ? [...METHODS] : [method]
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
    const path =
      typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path
    const h =
      typeof pathOrOptions === 'string' ? handler : pathOrOptions.handler
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
    const path =
      typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path
    const h =
      typeof pathOrOptions === 'string' ? handler : pathOrOptions.handler
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

  staticGet<
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
    ClientRoutes,
    RoutePaths | JoinPath<BasePath, Path>,
    RouteQuerySchemas & Record<JoinPath<BasePath, Path>, Schema['query']>
  > {
    this.add({
      method: 'GET',
      path,
      handler: handler,
      hooks: hook,
      kind: 'staticGet',
    })
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

  loader<
    const Path extends string,
    const Handle extends (
      context: SpiceflowContext<JoinPath<BasePath, Path>, {}, Singleton>,
    ) => Record<string, unknown> | Promise<Record<string, unknown>>,
  >(
    path: Path,
    handler: Handle,
  ): Spiceflow<
    BasePath,
    Scoped,
    Singleton,
    Definitions,
    Metadata & {
      loaderData: Record<JoinPath<BasePath, Path>, Awaited<ReturnType<Handle>>>
    },
    ClientRoutes,
    RoutePaths,
    RouteQuerySchemas
  > {
    const routeConfig = {
      path,
      handler: handler as any,
      kind: 'loader' as const,
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
        Metadata & {
          loaderData: BasePath extends ``
            ? NewSpiceflow['_types']['Metadata']['loaderData']
            : PrefixLoaderData<
                BasePath,
                NewSpiceflow['_types']['Metadata']['loaderData']
              >
        },
        BasePath extends ``
          ? ClientRoutes & NewSpiceflow['_types']['ClientRoutes']
          : ClientRoutes &
              CreateClient<BasePath, NewSpiceflow['_types']['ClientRoutes']>,
        BasePath extends ``
          ? RoutePaths | NewSpiceflow['_types']['RoutePaths']
          :
              | RoutePaths
              | PrefixPaths<BasePath, NewSpiceflow['_types']['RoutePaths']>,
        BasePath extends ``
          ? RouteQuerySchemas & NewSpiceflow['_types']['RouteQuerySchemas']
          : RouteQuerySchemas &
              PrefixQuerySchemas<
                BasePath,
                NewSpiceflow['_types']['RouteQuerySchemas']
              >
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

  private async resolveReactActionState({
    request,
    context,
    onErrorHandlers,
  }: {
    request: Request
    context: Partial<MiddlewareContext>
    onErrorHandlers: OnError[]
  }): Promise<ReactActionState | Response> {
    const emptyState: ReactActionState = {
      actionError: undefined,
      actionErrorDigest: undefined,
      returnValue: undefined,
      formState: undefined,
      temporaryReferences: undefined,
    }
    if (request.method !== 'POST') {
      return emptyState
    }

    // Skip origin check in development — tunnels, proxies, and different
    // ports constantly trigger false positives during local dev.
    const origin = request.headers.get('Origin')
    if (origin && !import.meta.hot) {
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

    const url = new URL(request.url)
    const actionId = url.searchParams.get('__rsc')
    const isCallServerRequest = Boolean(actionId)

    try {
      if (actionId) {
        const temporaryReferences = createTemporaryReferenceSet()
        const contentType = request.headers.get('content-type')
        const body = contentType?.startsWith('multipart/form-data')
          ? await request.formData()
          : await request.text()
        const args = await decodeReply(body, { temporaryReferences })
        const action = await loadServerAction(actionId)

        return {
          actionError: undefined,
          actionErrorDigest: undefined,
          returnValue: await actionRequestStorage.run(request, () =>
            action.apply(null, args),
          ),
          formState: undefined,
          temporaryReferences,
        }
      }

      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      if (typeof decodedAction !== 'function') {
        return emptyState
      }

      return {
        actionError: undefined,
        actionErrorDigest: undefined,
        returnValue: undefined,
        formState: await decodeFormState(
          await actionRequestStorage.run(request, () => decodedAction()),
          formData,
        ),
        temporaryReferences: undefined,
      }
    } catch (error) {
      // Redirect Responses thrown in callServer requests are encoded as action
      // errors with a __REACT_SERVER_ERROR__ digest so the client can detect
      // them and navigate via router.push(). Returning a raw 307 would cause
      // fetch() to follow the redirect (POST to new URL), which breaks on
      // Cloudflare Workers and other environments. Progressive enhancement
      // (no JS) forms still get the raw Response so the browser follows it.
      if (error instanceof Response && isRedirectStatus(error.status) && isCallServerRequest) {
        const headers = [...error.headers.entries()]
        const digest = `__REACT_SERVER_ERROR__:${JSON.stringify({ status: error.status, headers })}`
        const redirectError = new Error(digest)
        // Preserve non-location headers (e.g. set-cookie) from the redirect
        // Response so they can be sent on the actual HTTP flight response.
        const extraHeaders = new Headers(error.headers)
        extraHeaders.delete('location')
        return {
          actionError: redirectError,
          actionErrorDigest: digest,
          returnValue: undefined,
          formState: undefined,
          temporaryReferences: undefined,
          actionResponseHeaders: extraHeaders.keys().next().done ? undefined : extraHeaders,
        }
      }
      // Thrown Responses (redirect for progressive enhancement, notFound, etc.)
      // bypass the action payload — return them as HTTP responses.
      // For redirects from POST form actions, use 303 (See Other) so the browser
      // follows with a GET instead of re-POSTing to the target URL.
      if (error instanceof Response) {
        if (isRedirectStatus(error.status) && error.status === 307) {
          return new Response(null, {
            status: 303,
            headers: error.headers,
          })
        }
        return error
      }

      const actionError =
        error instanceof Error ? error : new Error(String(error))

      // Report action failures for both callServer requests and progressive
      // enhancement forms. callServer still needs the actionError payload so
      // the client error boundary can render it, so handler Responses only
      // take over the HTTP response for non-callServer submissions.
      const handlerResponse = await this.runErrorHandlers({
        context,
        onErrorHandlers,
        error: actionError,
        request,
      })
      if (handlerResponse && !isCallServerRequest) {
        return handlerResponse
      }

      return {
        actionError,
        actionErrorDigest: sanitizeErrorMessage(actionError.message),
        returnValue: undefined,
        formState: undefined,
        temporaryReferences: undefined,
      }
    }
  }

  async renderReact({
    request,
    context,
    reactRoutes,
  }: {
    request: Request
    context: SpiceflowContext<any, any, any>
    reactRoutes: ReactMatchedRoute[]
  }) {
    const [pageRoutes, nonPageRoutes] = partition(
      reactRoutes,
      (x) => x.route.kind === 'page' || x.route.kind === 'staticPage',
    )
    const [loaderRoutes, layoutRoutes] = partition(
      nonPageRoutes,
      (x) => x.route.kind === 'loader',
    )
    const pageRoute = pickBestRoute(pageRoutes)
    const hasLayoutRoute = layoutRoutes.some((x) => x.route.kind === 'layout')
    const hasRenderableRoute = !!pageRoute || hasLayoutRoute

    if (reactRoutes.length > 0 && !hasRenderableRoute) {
      return new Response('Not Found', { status: 404 })
    }

    // Only render the React 404 page for browser navigation requests (GET/HEAD
    // with sec-fetch-dest:document or Accept:text/html). API clients, curl, and
    // non-GET methods get plain text "Not Found" instead.
    const isSafeMethod = request.method === 'GET' || request.method === 'HEAD'
    const isBrowserNavigation =
      isDocumentRequest(request) ||
      request.headers.get('accept')?.includes('text/html')
    if (!pageRoute && !(isSafeMethod && isBrowserNavigation)) {
      return new Response('Not Found', { status: 404 })
    }

    const isNotFound = !pageRoute
    let baseResponse: ContextResponse | undefined
    const baseContext: SpiceflowContext<any, any, any> = {
      ...context,
      get response() {
        return (baseResponse ??= createContextResponse())
      },
    }

    const actionHandlers = [
      ...new Set(
        reactRoutes.flatMap((matchedRoute) => matchedRoute.app.onErrorHandlers),
      ),
    ]
    const actionState = await this.resolveReactActionState({
      request,
      context: baseContext,
      onErrorHandlers: actionHandlers,
    })
    if (actionState instanceof Response) {
      return actionState
    }

      try {
        return await routerContextStorage.run(
          createRouterContextData(request),
          async () => {
          // Execute loaders and merge their data directly. The trie router already
          // matched these loaders for this request — no need to re-match. Sort by
          // specificity so more specific loaders override less specific ones.
          loaderRoutes.sort(compareRouteSpecificity)
          let loaderError: Error | null = null
          const loaderResults = await Promise.all(
            loaderRoutes.map(async (loader) => {
              let handlerResponse: ContextResponse | undefined
              const loaderContext: SpiceflowContext<any, any, any> = {
                ...baseContext,
            params: loader.params,
            loaderData: {},
            get response() {
              return (handlerResponse ??= createContextResponse())
            },
          }
          try {
            if (!this.tracer) {
              const data = await loader.route.handler.call(
                loader.app,
                loaderContext,
              )
              if (data instanceof Response) throw data
              if (data == null)
                return {
                  data: null,
                  status: handlerResponse?.status,
                  headers: handlerResponse?.headers,
                }
              if (typeof data !== 'object' || Array.isArray(data)) {
                throw new Error(
                  `Loader "${loader.route.path}" must return a plain object, got ${Array.isArray(data) ? 'array' : typeof data}`,
                )
              }
              return {
                data,
                status: handlerResponse?.status,
                headers: handlerResponse?.headers,
              }
            }
            return await withSpan(
              this.tracer,
              `loader - ${loader.route.path}`,
              {},
              async (loaderSpan) => {
                if (loaderSpan) loaderContext.span = loaderSpan
                const data = await loader.route.handler.call(
                  loader.app,
                  loaderContext,
                )
                if (data instanceof Response) throw data
                if (data == null)
                  return {
                    data: null,
                    status: handlerResponse?.status,
                    headers: handlerResponse?.headers,
                  }
                if (typeof data !== 'object' || Array.isArray(data)) {
                  throw new Error(
                    `Loader "${loader.route.path}" must return a plain object, got ${Array.isArray(data) ? 'array' : typeof data}`,
                  )
                }
                return {
                  data,
                  status: handlerResponse?.status,
                  headers: handlerResponse?.headers,
                }
              },
            )
          } catch (error) {
            // Redirect/notFound Responses short-circuit the entire request
            if (error instanceof Response) throw error
            // Other errors are surfaced via error boundary during RSC render
            if (!loaderError)
              loaderError =
                error instanceof Error ? error : new Error(String(error))
            return {
              data: null,
              status: handlerResponse?.status,
              headers: handlerResponse?.headers,
            }
          }
            }),
          )
          const mergedLoaderData: Record<string, unknown> = {}
          let loaderStatus: number | undefined
          const loaderResponseHeaders = new Headers()
          for (const result of loaderResults) {
            if (result.data != null) Object.assign(mergedLoaderData, result.data)
            if (result.status && result.status !== 200) loaderStatus = result.status
            if (result.headers) appendHeaders(loaderResponseHeaders, result.headers)
          }
          const routerContext = routerContextStorage.getStore()
          if (routerContext) {
            routerContext.loaderData = mergedLoaderData
          }

          const executeHandler = async (
            route: ReactMatchedRoute,
            extra?: { id: string; children: React.ReactNode },
            activeSpan?: SpiceflowSpan,
          ): Promise<RouteResult> => {
            let handlerResponse: ContextResponse | undefined
            const handlerContext: SpiceflowContext<any, any, any> = {
              ...baseContext,
              params: route.params,
              loaderData: mergedLoaderData,
              ...(extra && { children: extra.children }),
              ...(activeSpan && { span: activeSpan }),
              get response() {
                return (handlerResponse ??= createContextResponse())
              },
            }
            try {
              const value = await route.route.handler.call(
                route.app,
                handlerContext,
              )
              if (value instanceof Error) {
                // Wrap in a component that throws during RSC rendering so error
                // boundaries can catch it and the __NO_HYDRATE shell renders.
                return {
                  ok: true,
                  value: <ThrowError error={value} />,
                  headers: handlerResponse?.headers,
                  status: handlerResponse?.status,
                }
              }
              return {
                ok: true,
                value,
                headers: handlerResponse?.headers,
                status: handlerResponse?.status,
              }
            } catch (error) {
              return {
                ok: false,
                error,
                headers: handlerResponse?.headers,
                status: handlerResponse?.status,
              }
            }
          }

      const filteredLayouts = layoutRoutes.filter(
        (layout) => layout.route.kind === 'layout',
      )
      const layoutResultsPromise = filteredLayouts.map(
        async (layout) => {
          const id = layout.route.id
          // When no page matched, all layouts receive null children so any
          // layout in the chain can detect 404 and render a custom not-found UI.
          const children = isNotFound
            ? null
            : createElement(LayoutContent, { id })
          const result = !this.tracer
            ? await executeHandler(layout, { id, children })
            : await withSpan(
                this.tracer,
                `layout - ${layout.route.path}`,
                {},
                async (span) => {
                  const res = await executeHandler(
                    layout,
                    { id, children },
                    span,
                  )
                  if (!res.ok && !(res.error instanceof Response) && span) {
                    recordError(span, res.error)
                  }
                  return res
                },
              )
          return { ...result, id }
        },
      )

      // Skip page handler when a loader failed — the error will be rendered
      // via <ThrowError> so the layout error boundary catches it.
      const pageResultPromise = loaderError
        ? Promise.resolve({
            ok: true as const,
            value: <ThrowError error={loaderError} />,
            headers: undefined,
            status: undefined,
          })
        : isNotFound
          ? Promise.resolve({
              ok: true as const,
              value: <DefaultNotFoundPage />,
              headers: undefined,
              status: undefined,
            })
          : !this.tracer
            ? executeHandler(pageRoute)
            : withSpan(
                this.tracer,
                `page - ${pageRoute.route.path}`,
                {},
                async (span) => {
                  const res = await executeHandler(pageRoute, undefined, span)
                  if (!res.ok && !(res.error instanceof Response) && span) {
                    recordError(span, res.error)
                  }
                  return res
                },
              )

      const [layoutResults, pageResult] = await Promise.all([
        Promise.all(layoutResultsPromise),
        pageResultPromise,
      ])

      const allResults = [...layoutResults, pageResult]
      const getReturnedResponse = (result: RouteResult) => {
        if (!result.ok) {
          return
        }
        return isResponse(result.value) ? result.value : undefined
      }

      const routeHeaders = new Headers()
      // Loader headers first (lowest priority), then layout/page headers override
      appendHeaders(routeHeaders, loaderResponseHeaders)
      for (const result of allResults) {
        if (result.headers) appendHeaders(routeHeaders, result.headers)
      }

      const returnedPageResponse = getReturnedResponse(pageResult)
      const returnedLayoutResponse = [...layoutResults]
        .reverse()
        .map(getReturnedResponse)
        .find(isTruthy)
      const returnedRedirectResponse =
        returnedPageResponse && isRedirectStatus(returnedPageResponse.status)
          ? returnedPageResponse
          : returnedLayoutResponse && isRedirectStatus(returnedLayoutResponse.status)
            ? returnedLayoutResponse
            : undefined
      if (returnedRedirectResponse) {
        return mergeHeadersIntoResponse({
          response: returnedRedirectResponse,
          source: routeHeaders,
        })
      }

      const firstError = allResults.find(
        (r) => !r.ok && !isResponse(r.error),
      )
      if (firstError && !firstError.ok) {
        throw firstError.error
      }

      // When isNotFound, all layouts get null children so their
      // ThrowResponse elements would be orphaned (root layout doesn't
      // include LayoutContent). Promote layout Response throws
      // (redirect/notFound) so they still take effect.
      if (isNotFound) {
        const layoutResponse = [...layoutResults]
          .reverse()
          .find(
            (result): result is typeof result & { ok: false; error: Response } =>
              !result.ok && isResponse(result.error),
          )
        if (layoutResponse) {
          return mergeHeadersIntoResponse({
            response: layoutResponse.error,
            source: routeHeaders,
          })
        }
      }

      const layouts = layoutResults.map((layout) => {
        const returnedResponse = getReturnedResponse(layout)
        return {
          id: layout.id,
          element: returnedResponse ? (
            <ThrowResponse response={returnedResponse} />
          ) : layout.ok ? (
            layout.value
          ) : (
            <ThrowResponse response={layout.error as Response} />
          ),
        }
      })

      const page = returnedPageResponse ? (
        <ThrowResponse response={returnedPageResponse} />
      ) : pageResult.ok ? (
        pageResult.value
      ) : (
        <ThrowResponse response={pageResult.error as Response} />
      )

      // Global CSS: rscCssTransform auto-wraps component exports, but this entry
      // exports a Spiceflow instance so we call loadCss manually.
      // NOTE: the loadCss call MUST appear exactly as `import.meta.viteRsc.loadCss(`
      // because vite-rsc's transform uses a regex to find and replace it at build time.
      // Do not use optional chaining, ternaries around the same expression, or put the
      // pattern in comments — any of these can confuse the regex-based transform.
      const globalCssResult = errore.try(() =>
        import.meta.viteRsc.loadCss('virtual:app-entry'),
      )
      const globalCss =
        globalCssResult instanceof Error ? undefined : globalCssResult
      let baseUrl = new URL('/', request.url).href
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1)
      }

      const hasLoaderData = Object.keys(mergedLoaderData).length > 0
      let root: FlightData = {
        page,
        layouts,
        globalCss,
        ...(hasLoaderData && { loaderData: mergedLoaderData }),
        head: <CollectedHead baseUrl={baseUrl} />,
      }

      if (root instanceof Response) {
        return mergeHeadersIntoResponse({
          response: root,
          source: routeHeaders,
        })
      }

      const payload =
        request.method === 'GET' || request.method === 'HEAD'
          ? ({ root } satisfies ServerPayload)
           : ({
              root,
              returnValue: actionState.returnValue,
              formState: actionState.formState,
              actionError: actionState.actionError,
              actionErrorDigest: actionState.actionErrorDigest,
            } satisfies ServerPayload)
      const buildRscResponse = async (serializeSpan?: SpiceflowSpan) => {
        const stream = renderToReadableStream<ServerPayload>(payload, {
          temporaryReferences: actionState.temporaryReferences,
          onError(error) {
            // TODO: for error reporting (Sentry-like), we need an error.handled
            // attribute to distinguish breaking errors from error-boundary-caught ones.
            // React's onError fires for both, but at this point we don't know if an
            // error boundary will catch it. Errors caught by boundaries are graceful
            // degradation (log-only), not incidents (notify). Same applies to loader
            // errors — they render through error boundaries, page still works.
            // When we build our own error reporting, add severity/handled classification
            // so non-breaking errors don't trigger notifications.
            if (serializeSpan) {
              recordError(serializeSpan, error)
            }
            if (error instanceof Response) {
              const headers = [...error.headers.entries()]
              return `__REACT_SERVER_ERROR__:${JSON.stringify({ status: error.status, headers })}`
            }
            formatServerError(error)
            if (verboseLogs) {
              console.error('[spiceflow:renderToReadableStream]', error)
            }
            return sanitizeErrorMessage(error?.digest || error?.message)
          },
          signal: request.signal,
        })

        const headers = new Headers({
          'content-type': 'text/x-component;charset=utf-8',
          'cache-control': 'no-store',
        })
        appendHeaders(headers, routeHeaders)
        if (actionState.actionResponseHeaders) {
          appendHeaders(headers, actionState.actionResponseHeaders)
        }

        const pageHandlerStatus =
          returnedPageResponse?.status && returnedPageResponse.status !== 200
            ? returnedPageResponse.status
            : pageResult.status && pageResult.status !== 200
              ? pageResult.status
              : undefined
        const layoutHandlerStatus = [...layoutResults]
          .reverse()
          .map((layout) => {
            const returnedResponse = getReturnedResponse(layout)
            if (returnedResponse?.status && returnedResponse.status !== 200) {
              return returnedResponse.status
            }
            if (layout.status && layout.status !== 200) {
              return layout.status
            }
            return
          })
          .find(isTruthy)
        const status =
          pageHandlerStatus ?? layoutHandlerStatus ?? loaderStatus ?? (isNotFound ? 404 : 200)

        return new Response(stream, { status, headers })
      }
          if (!this.tracer) return buildRscResponse()
          return withSpan(this.tracer, 'rsc.serialize', {}, buildRscResponse)
        },
      )
    } catch (error) {
      if (error instanceof Response) {
        return mergeHeadersIntoResponse({
          response: error,
          source: baseResponse?.headers,
        })
      }
      throw error
    }
  }

  handle = async (
    incomingRequest: Request,
    { state: customState }: { state?: Singleton['state'] } = {},
  ): Promise<Response> => {
    const request =
      incomingRequest instanceof SpiceflowRequest
        ? incomingRequest
        : new SpiceflowRequest(incomingRequest.url, incomingRequest)
    const u = request.parsedUrl

    let path = u.pathname
    // Strip .rsc suffix before route matching — the client appends it for RSC
    // data fetches, but routes are registered without it.
    if (path.endsWith('/index.rsc')) {
      path = path.slice(0, -9)
    } else if (path.endsWith('.rsc')) {
      path = path.slice(0, -4)
    }

    if (path !== u.pathname) {
      const normalizedUrl = new URL(request.url)
      normalizedUrl.pathname = path
      request.overrideUrl(normalizedUrl.toString())
    }

    if (!this.tracer) return this.executeRequest(request, u, path, customState)

    return withSpan(
      this.tracer,
      request.method,
      {
        kind: SPAN_KIND_SERVER,
        attributes: {
          [ATTR.HTTP_REQUEST_METHOD]: request.method,
          [ATTR.URL_FULL]: request.url,
          [ATTR.URL_PATH]: path,
        },
      },
      async (rootSpan) => {
        return this.executeRequest(request, u, path, customState, rootSpan)
      },
    )
  }

  private executeRequest = async (
    request: SpiceflowRequest,
    u: URL,
    path: string,
    customState: any,
    rootSpan?: SpiceflowSpan,
  ): Promise<Response> => {
    const shouldUseDeploymentId = isDocumentRequest(request) || isRscRequest(u)
    const deploymentId = shouldUseDeploymentId
      ? await getDeploymentId()
      : undefined

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
      const res = new Response(null, {
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
      finalizeRequestSpan(rootSpan, res)
      return res
    }

    // Mutable ref — set after route resolution, read by waitUntil on error
    let onErrorHandlers: OnError[] = []
    let contextResponse: ContextResponse | undefined
    let _query: Record<string, any> | undefined
    const context: SpiceflowContext<any, any, any> = {
      redirect,
      state: customState || cloneDeep(this.defaultState),
      get query() {
        return (_query ??= parseQuery((u.search || '').slice(1)))
      },
      set query(v) {
        _query = v
      },
      request,
      path,
      params: {},
      loaderData: {},
      span: noopSpan,
      tracer: this.tracer ?? noopTracer,
      waitUntil: (promise: Promise<any>) => {
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
      },
      get response() {
        return (contextResponse ??= createContextResponse())
      },
    }

    const finalizeResponse = (response: Response, stripBody: boolean) => {
      const finalized = this.finalizeHeadResponse(
        response,
        stripBody,
        request.method === 'HEAD',
      )
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
        createDeploymentCookie({ deploymentId, basePath: root.basePath }),
      )
      return new Response(finalized.body, {
        status: finalized.status,
        statusText: finalized.statusText,
        headers,
      })
    }

    return routerContextStorage.run(createRouterContextData(request), async () => {
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

      const resolved = this.resolveRoutes(request, routes)

      if (resolved.react) {
        const reactRoute = resolved.reactRoutes.find(
          (r) => r.route.kind === 'page' || r.route.kind === 'staticPage',
        )?.route.path
        if (rootSpan && reactRoute)
          rootSpan.updateName(`${request.method} ${reactRoute}`)

        const appsInScope = this.getAppsInScope(resolved.fallbackApp)
        onErrorHandlers = appsInScope.flatMap((x) => x.onErrorHandlers)

        const shouldSsr = !!renderSsr && !isRscRequest(u)
        let response = await this.runMiddlewareChain(
          appsInScope.flatMap((x) => x.middlewares),
          context,
          onErrorHandlers,
          async () => {
            let res = await this.renderReact({
              request,
              context,
              reactRoutes: resolved.reactRoutes,
            })
            if (
              shouldSsr &&
              renderSsr &&
              res.headers.get('content-type')?.startsWith('text/x-component')
            ) {
              res = this.tracer
                ? await withSpan(this.tracer, 'ssr.render', {}, () =>
                    renderSsr!(res, request),
                  )
                : await renderSsr(res, request)
            }
            return res
          },
        )

        const result = finalizeResponse(response, shouldStripHeadBody)
        finalizeRequestSpan(rootSpan, result, reactRoute)
        return result
      }

      const { route } = resolved
      const isRealRoute = route?.route?.handler !== notFoundHandler
      const routeTemplate = isRealRoute ? route?.route?.path : undefined
      if (rootSpan && routeTemplate)
        rootSpan.updateName(`${request.method} ${routeTemplate}`)

      const appsInScope = this.getAppsInScope(route.app)
      onErrorHandlers = appsInScope.flatMap((x) => x.onErrorHandlers)

      if (route?.route?.validateBody && request instanceof SpiceflowRequest) {
        request.validateBody = route?.route?.validateBody
      }
      context['params'] = route.params

      const scopedMiddlewares = appsInScope.flatMap((x) => x.middlewares)
      const middlewares = scopedMiddlewares.filter((x) => !isStaticMiddleware(x))
      const staticMiddlewares = scopedMiddlewares.filter((x) =>
        isStaticMiddleware(x),
      )
      const shouldTryStatic = routeShouldYieldToStatic(route.route)
      const middlewareChain = shouldTryStatic
        ? [...middlewares, ...staticMiddlewares]
        : middlewares

      let response = await this.runMiddlewareChain(
        middlewareChain,
        context,
        onErrorHandlers,
        async () => {
          context.query = await runValidation(
            coerceQueryWithSchema(context.query, route?.route?.hooks?.query),
            route?.route?.validateQuery,
          )
          context.params = await runValidation(
            context.params,
            route?.route?.validateParams,
          )

          if (!this.tracer) {
            const res = await route?.route?.handler.call(this, context)
            // Returning an Error from a handler is treated the same as throwing it:
            // routes through errorToResponse → onError handlers → status extraction.
            if (res instanceof Error) {
              throw res
            }
            if (isAsyncIterable(res)) {
              return this.handleStream({
                generator: res,
                request,
                onErrorHandlers,
                route: route?.route,
                context,
              })
            }
            return this.turnHandlerResultIntoResponse(res, route?.route, request)
          }
          return withSpan(
            this.tracer,
            `handler - ${route?.route?.path || path}`,
            {},
            async (handlerSpan) => {
              const prevSpan = context.span
              if (handlerSpan) context.span = handlerSpan
              try {
                const res = await route?.route?.handler.call(this, context)
                // Returning an Error from a handler is treated the same as throwing it:
                // routes through errorToResponse → onError handlers → status extraction.
                if (res instanceof Error) {
                  throw res
                }
                if (isAsyncIterable(res)) {
                  return this.handleStream({
                    generator: res,
                    request,
                    onErrorHandlers,
                    route: route?.route,
                    context,
                  })
                }
                return this.turnHandlerResultIntoResponse(
                  res,
                  route?.route,
                  request,
                )
              } finally {
                context.span = prevSpan
              }
            },
          )
        },
        route?.route,
      )

      response = mergeHeadersIntoResponse({
        response,
        source: contextResponse?.headers,
      })

      // Respect context.response.status for plain-object/JSON handlers, but do
      // not override explicit statuses from returned/thrown Response objects.
      if (
        contextResponse?.status &&
        contextResponse.status !== 200 &&
        response.status === 200
      ) {
        response = new Response(response.body, {
          status: contextResponse.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      }

      const result = finalizeResponse(response, shouldStripHeadBody)
      finalizeRequestSpan(rootSpan, result, routeTemplate)
      return result
    })
  }

  private resolveRoutes(
    request: Request,
    routes: MatchedRoute[],
  ):
    | {
        react: true
        reactRoutes: ReactMatchedRoute[]
        fallbackApp: AnySpiceflow
      }
    | { react: false; route: MatchedRoute } {
    const [nonReactRoutes, reactRoutes] = partition(
      routes,
      (x) => !x.route.kind || x.route.kind === 'staticGet',
    )
    const typedReactRoutes = reactRoutes.filter(isReactMatchedRoute)

    const isSafeMethod = request.method === 'GET' || request.method === 'HEAD'
    const isBrowserNavigation =
      isDocumentRequest(request) ||
      request.headers.get('accept')?.includes('text/html')
    const isUnmatchedRoute =
      nonReactRoutes.length === 1 &&
      nonReactRoutes[0]?.route?.handler === notFoundHandler
    const appHasReactPages = this.getAllRoutes().some(
      (r) => r.kind === 'page' || r.kind === 'staticPage',
    )
    const shouldRenderReact404 =
      isUnmatchedRoute &&
      !reactRoutes.length &&
      appHasReactPages &&
      isSafeMethod &&
      isBrowserNavigation
    const hasPageMatch = typedReactRoutes.some(
      (x) => x.route.kind === 'page' || x.route.kind === 'staticPage',
    )
    const hasLayoutMatch = typedReactRoutes.some((x) => x.route.kind === 'layout')
    const hasRealApiRoute = nonReactRoutes.some(
      (x) => x.route.handler !== notFoundHandler,
    )
    const shouldEnterReact = !!(
      hasPageMatch || (hasLayoutMatch && !hasRealApiRoute) || shouldRenderReact404
    )

    if (shouldEnterReact) {
      return {
        react: true,
        reactRoutes: typedReactRoutes,
        fallbackApp: reactRoutes[0]?.app || nonReactRoutes[0]?.app || this,
      }
    }

    if (nonReactRoutes.length === 0) {
      return {
        react: false,
        route: createNotFoundMatchedRoute({
          app: reactRoutes[0]?.app || this,
          method: request.method,
          path: new URL(request.url).pathname,
        }),
      }
    }

    return { react: false, route: pickBestRoute(nonReactRoutes) }
  }

  private async runMiddlewareChain(
    middlewares: Function[],
    context: SpiceflowContext<any, any, any>,
    onErrorHandlers: OnError[],
    finalHandler: () => Promise<Response>,
    route?: InternalRoute,
  ): Promise<Response> {
    let index = 0
    let handlerResponse: Response | undefined

    const next = async (): Promise<Response> => {
      try {
        if (index < middlewares.length) {
          const middleware = middlewares[index]
          index++
          const result = this.tracer
            ? await withSpan(
                this.tracer,
                `middleware - ${middleware.name || 'anonymous'}`,
                {},
                async (mwSpan) => {
                  const prevSpan = context.span
                  if (mwSpan) context.span = mwSpan
                  try {
                    return await middleware(context, next)
                  } finally {
                    context.span = prevSpan
                  }
                },
              )
            : await middleware(context, next)
          if (isResponse(result)) {
            handlerResponse = result
          }
          if (!result && index < middlewares.length) {
            return await next()
          }
          if (result) {
            return this.turnHandlerResultIntoResponse(
              result,
              route,
              context.request,
            )
          }
        }
        if (handlerResponse) {
          return handlerResponse
        }
        handlerResponse = await finalHandler()
        return handlerResponse
      } catch (err) {
        handlerResponse = await this.errorToResponse(
          err,
          context,
          onErrorHandlers,
        )
        return await next()
      }
    }

    return next()
  }

  private async errorToResponse(
    err: any,
    context: Partial<MiddlewareContext>,
    onErrorHandlers: OnError[],
  ): Promise<Response> {
    if (isResponse(err)) return err
    const errCtx = getErrorContext(err)
    const redirectInfo = isRedirectError(errCtx)
    if (redirectInfo) {
      return new Response(redirectInfo.location, {
        status: errCtx!.status,
        headers: contextToHeaders(errCtx!),
      })
    }
    if (isNotFoundError(errCtx)) {
      return new Response(JSON.stringify('not found'), { status: 404 })
    }
    const request = context.request!
    let res = await this.runErrorHandlers({
      context,
      onErrorHandlers,
      error: err,
      request,
    })
    if (isResponse(res)) return res

    let status = err?.status ?? err?.statusCode ?? 500
    if (typeof status !== 'number' || status < 100 || status > 599) {
      status = 500
    }
    return new Response(
      this.superjsonSerialize(
        {
          ...err,
          message: err?.message || 'Internal Server Error',
        },
        false,
        request,
      ),
      { status, headers: { 'content-type': 'application/json' } },
    )
  }

  private finalizeHeadResponse(
    response: Response,
    stripBody: boolean,
    isHead: boolean,
  ) {
    // per HTTP spec, HEAD responses must never include a body
    if (!stripBody && !isHead) return response
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    })
  }

  protected superjsonSerialize(
    value: any,
    indent = false,
    request?: Request,
  ): string {
    const isRpcRequest =
      request?.headers.get('x-spiceflow-agent') === 'spiceflow-client'

    // If flag is set and this is not an RPC request, use regular JSON
    if (this.disableSuperJsonUnlessRpc && !isRpcRequest) {
      return JSON.stringify(value ?? null, null, indent ? 2 : undefined)
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
    const reportKey = getErrorReportKey(err)
    const reportedErrors = getReportedErrorKeys(request)
    if (reportedErrors.has(reportKey)) return

    reportedErrors.add(reportKey)

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
            headers: contextToHeaders(errCtx!),
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

  async listen(
    port: number,
    hostname: string = '0.0.0.0',
  ): Promise<SpiceflowListenResult> {
    // In Vite dev, Vite owns the server — noop
    if (import.meta.hot) return createNoopListenResult()
    // During prerender, skip server startup — we only need the app instance.
    // Uses globalThis instead of process.env because bundlers replace
    // process.env.X with its build-time value (undefined), dead-code eliminating the check.
    if ((globalThis as any).__SPICEFLOW_PRERENDER)
      return createNoopListenResult()
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

      const stop = async () => {
        server.stop()
      }

      process.on('beforeExit', () => {
        void stop()
      })

      const displayedHost =
        server.hostname === '0.0.0.0' ? 'localhost' : server.hostname
      console.log(`Listening on http://${displayedHost}:${server.port}`)

      return { port: server.port, server, stop }
    }

    // Deno native server — uses Deno.serve() with web standard Request/Response,
    // bypassing the node:http adapter for better performance.
    if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
      const server = Deno.serve({ port, hostname }, handler) as {
        shutdown: () => Promise<void>
      }

      return {
        port,
        server,
        stop: async () => {
          await server.shutdown()
        },
      }
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
    context,
  }: {
    generator: Generator | AsyncGenerator
    onErrorHandlers: OnError[]
    request: Request
    route: InternalRoute
    context?: Partial<MiddlewareContext>
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

    // Get an explicit async iterator so pull() can advance one step at a time.
    // Generators implement .next() directly, while other async iterables
    // (e.g. ReadableStream) need [Symbol.asyncIterator]() to produce one.
    const iterator: AsyncIterator<unknown> =
      typeof (generator as any).next === 'function'
        ? (generator as AsyncIterator<unknown>)
        : (generator as any)[Symbol.asyncIterator]()

    let end = false
    let ping: ReturnType<typeof setInterval> | undefined
    let onAbort: (() => void) | undefined

    // Idempotent cleanup: clears ping, removes abort listener, terminates iterator
    const cleanup = () => {
      if (end) return
      end = true
      if (ping) {
        clearInterval(ping)
        ping = undefined
      }
      if (onAbort) {
        request?.signal?.removeEventListener('abort', onAbort)
        onAbort = undefined
      }
      void iterator.return?.()
    }

    return new Response(
      new ReadableStream({
        start(controller) {
          ping = setInterval(() => {
            if (!end) {
              try {
                controller.enqueue(Buffer.from('\n'))
              } catch {
                cleanup()
              }
            }
          }, 10 * 1000)

          onAbort = () => {
            cleanup()
            try {
              controller.close()
            } catch {}
          }
          request?.signal?.addEventListener('abort', onAbort)

          // Enqueue the already-extracted init value (first generator
          // result, used above for done detection). Subsequent values
          // are produced on-demand by pull().
          if (init?.value !== undefined && init?.value !== null) {
            controller.enqueue(
              Buffer.from(
                'event: message\ndata: ' +
                  self.superjsonSerialize(init.value, false, request) +
                  '\n\n',
              ),
            )
          }
        },

        async pull(controller) {
          if (end) {
            try {
              controller.close()
            } catch {}
            return
          }

          try {
            const { value: chunk, done } = await iterator.next()

            if (done || end) {
              cleanup()
              try {
                controller.close()
              } catch {}
              return
            }

            // null/undefined chunks are skipped; the runtime will
            // call pull() again since nothing was enqueued.
            if (chunk === undefined || chunk === null) return

            controller.enqueue(
              Buffer.from(
                'event: message\ndata: ' +
                  self.superjsonSerialize(chunk, false, request) +
                  '\n\n',
              ),
            )
          } catch (error: any) {
            await self.runErrorHandlers({
              context: context ?? {},
              onErrorHandlers: onErrorHandlers,
              error,
              request,
            })
            try {
              controller.enqueue(
                Buffer.from(
                  'event: error\ndata: ' +
                    self.superjsonSerialize(
                      {
                        ...error,
                        message: error.message || error.name || 'Error',
                      },
                      false,
                      request,
                    ) +
                    '\n\n',
                ),
              )
            } catch {}
            cleanup()
            try {
              controller.close()
            } catch {}
          }
        },

        cancel() {
          cleanup()
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
  href<
    const Path extends AllHrefPaths<RoutePaths>,
    const Params extends ExtractParamsFromPath<Path>,
  >(
    path: Path,
    ...rest: HrefArgs<RoutePaths, RouteQuerySchemas, Path, Params>
  ): string {
    return buildHref(path, rest[0] as Record<string, any> | undefined)
  }
}

/**
 * Create a standalone type-safe path builder. Pass your app instance for automatic
 * type inference, or call with explicit type params. The app value is not used at runtime.
 *
 * ```ts
 * const app = new Spiceflow()
 *   .get('/users/:id', handler, { query: z.object({ page: z.number() }) })
 *
 * const href = createHref(app)
 * href('/users/:id', { id: '123', page: 1 })
 * ```
 */
export function createHref<
  T extends { _types: { RoutePaths: string; RouteQuerySchemas: object } },
>(_app?: T) {
  type Paths = T['_types']['RoutePaths']
  type QS = T['_types']['RouteQuerySchemas']
  return <
    const Path extends AllHrefPaths<Paths>,
    const Params extends
      ExtractParamsFromPath<Path> = ExtractParamsFromPath<Path>,
  >(
    path: Path,
    ...rest: HrefArgs<Paths, QS, Path, Params>
  ): string => {
    return buildHref(path, rest[0] as Record<string, any> | undefined)
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

function isMethod(value: string): value is Method {
  return METHODS.some((method) => method === value)
}

function createNotFoundMatchedRoute({
  app,
  method,
  path,
}: {
  app: AnySpiceflow
  method: string
  path: string
}): MatchedRoute {
  return {
    app,
    route: {
      id: `__not_found__:${method}:${path}`,
      type: '',
      method: isMethod(method) ? method : 'GET',
      path,
      handler: notFoundHandler,
      hooks: {},
    },
    params: {},
  }
}

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
  private _urlOverride?: string
  /** Original transport URL before Spiceflow normalizes .rsc pathnames for handlers. */
  private _originalUrl: string
  /** Lazily parsed URL, cached on first access so we only parse once */
  private _parsedUrl?: URL

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init)
    this._originalUrl = super.url
  }

  /** Raw incoming request URL, including transport-only `.rsc` pathnames when present. */
  get originalUrl(): string {
    return this._originalUrl
  }

  /**
   * App-facing request URL.
   *
   * For RSC transport requests, Spiceflow strips the `.rsc` pathname suffix before
   * user handlers run, but intentionally keeps the `__rsc` query param so middleware
   * and static serving can still detect Flight requests.
   */
  override get url(): string {
    return this._urlOverride ?? super.url
  }

  overrideUrl(url: string) {
    this._urlOverride = url
    this._parsedUrl = undefined
    return this
  }

  get parsedUrl(): URL {
    this._parsedUrl ??= new URL(this.url, 'http://localhost')
    return this._parsedUrl
  }
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

type RouteResult =
  | {
      ok: true
      value: React.ReactNode
      headers?: Headers
      status?: number
    }
  | {
      ok: false
      error: unknown
      headers?: Headers
      status?: number
    }

type ReactRoute = InternalRoute & {
  kind: 'page' | 'staticPage' | 'layout' | 'loader'
  handler: (this: AnySpiceflow, context: SpiceflowContext<any, any, any>) => any
}

type ReactMatchedRoute = {
  route: ReactRoute
  app: AnySpiceflow
  params: Record<string, string>
}

type ReactActionState = {
  actionError: Error | undefined
  actionErrorDigest: string | undefined
  returnValue: unknown | undefined
  formState: ReactFormState | undefined
  temporaryReferences:
    | ReturnType<(typeof import('#rsc-runtime'))['createTemporaryReferenceSet']>
    | undefined
  // Extra headers from redirect responses (e.g. set-cookie) that should be
  // merged into the flight HTTP response even though the redirect itself is
  // encoded in the action error digest for client-side navigation.
  actionResponseHeaders?: Headers
}

function isReactMatchedRoute(route: {
  route: InternalRoute
  app: AnySpiceflow
  params: Record<string, string>
}): route is ReactMatchedRoute {
  return !!route.route.kind
}

function ThrowResponse({ response }: { response: Response }): never {
  throw response
}

function ThrowError({ error }: { error: Error }): never {
  throw error
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
  const endIndex =
    suffixLength > 0 ? urlParts.length - suffixLength : urlParts.length
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
  const staticSegmentCount =
    parts.length - wildcardCount - regexParamCount - namedParamCount
  const segmentCount = parts.length
  return {
    wildcardCount,
    namedParamCount,
    regexParamCount,
    staticSegmentCount,
    segmentCount,
  }
}

function pickBestRoute<T extends { route: InternalRoute; app?: AnySpiceflow }>(
  routes: T[],
): T {
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
    // 6. Same pattern shape: within the same app instance last registered
    //    wins (route override). Across different apps first match wins
    //    (parent / earlier .use() takes priority, matching Express/Hono).
    if (best.app && routes[i].app && best.app === routes[i].app) {
      best = routes[i]
      bestSpec = spec
    }
  }
  return best
}

function routeShouldYieldToStatic(route: InternalRoute) {
  return (
    route.handler === notFoundHandler ||
    route.path === '/*' ||
    route.path === '*'
  )
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

// Sort comparator: least specific first, most specific last.
// Uses the same specificity logic as pickBestRoute so merge ordering
// is consistent: Object.assign spreads least-specific first, most-specific wins.
function compareRouteSpecificity(
  a: { route: InternalRoute },
  b: { route: InternalRoute },
): number {
  const sa = getRouteSpecificity(a.route)
  const sb = getRouteSpecificity(b.route)
  // More wildcards = less specific (sort first)
  if (sa.wildcardCount !== sb.wildcardCount)
    return sb.wildcardCount - sa.wildcardCount
  // Fewer static segments = less specific
  if (sa.staticSegmentCount !== sb.staticSegmentCount)
    return sa.staticSegmentCount - sb.staticSegmentCount
  // Fewer regex params = less specific
  if (sa.regexParamCount !== sb.regexParamCount)
    return sa.regexParamCount - sb.regexParamCount
  // More named params = less specific
  if (sa.namedParamCount !== sb.namedParamCount)
    return sb.namedParamCount - sa.namedParamCount
  // Fewer segments = less specific
  return sa.segmentCount - sb.segmentCount
}

export interface ServerPayload {
  root: FlightData
  formState?: ReactFormState
  returnValue?: unknown
  actionError?: Error
  actionErrorDigest?: string
}
