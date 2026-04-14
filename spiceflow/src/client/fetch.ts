// Type-safe fetch-like client for Spiceflow. Uses a familiar fetch(path, options)
// interface instead of the proxy-based chainable API.
import type { AnySpiceflow, Spiceflow } from '../spiceflow.ts'
import type { ExtractParamsFromPath, IsAny } from '../types.ts'

import type { SpiceflowClient } from './types.ts'
import type { ReplaceGeneratorWithAsyncGenerator } from './types.ts'
import { SpiceflowFetchError } from './errors.ts'

import {
  processHeaders,
  buildQueryString,
  serializeBody,
  parseResponseData,
  executeWithRetries,
} from './shared.ts'

// ─── Type utilities ──────────────────────────────────────────────────────────

type HttpMethodLower =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'options'
  | 'head'
  | 'connect'
  | 'subscribe'

// Flatten the nested ClientRoutes tree back into path strings.
// Inverts CreateClient: { users: { ':id': { get: ... } } } → '/users/:id'
type FlattenClientRoutes<
  T,
  Prefix extends string = '',
  Depth extends unknown[] = [],
> = Depth['length'] extends 8
  ? never
  : T extends Record<string, any>
    ? {
        [K in Exclude<keyof T & string, HttpMethodLower>]:
          | ([Extract<keyof T[K] & string, HttpMethodLower>] extends [never]
              ? never
              : K extends 'index'
                ? Prefix extends ''
                  ? '/'
                  : `/${Prefix}`
                : Prefix extends ''
                  ? `/${K}`
                  : `/${Prefix}/${K}`)
          | FlattenClientRoutes<
              T[K],
              K extends 'index'
                ? Prefix
                : Prefix extends ''
                  ? K
                  : `${Prefix}/${K}`,
              [...Depth, unknown]
            >
      }[Exclude<keyof T & string, HttpMethodLower>]
    : never

// Extract all valid path strings from a Spiceflow app's ClientRoutes
type AppClientPaths<App extends AnySpiceflow> = App extends {
  _types: { ClientRoutes: infer Routes extends Record<string, any> }
}
  ? IsAny<Routes> extends true
    ? string
    : FlattenClientRoutes<Routes>
  : string

// Navigate the nested ClientRoutes tree given a path string.
// Reverses what CreateClient does: `/users/:id` → Routes['users'][':id']
type NavigateRoutes<Routes, Path extends string> = Path extends `/${infer Rest}`
  ? Rest extends ''
    ? 'index' extends keyof Routes
      ? Routes['index']
      : never
    : _NavigateRoutes<Routes, Rest>
  : _NavigateRoutes<Routes, Path>

type _NavigateRoutes<
  Routes,
  Path extends string,
> = Path extends `${infer Segment}/${infer Rest}`
  ? Segment extends keyof Routes
    ? _NavigateRoutes<Routes[Segment], Rest>
    : never
  : Path extends keyof Routes
    ? Routes[Path]
    : never

type RouteAtPath<
  Routes extends Record<string, any>,
  Path extends string,
> = NavigateRoutes<Routes, Path>

type MethodsAtPath<
  Routes extends Record<string, any>,
  Path extends string,
> = Extract<keyof RouteAtPath<Routes, Path>, HttpMethodLower>

type AllowedMethod<Routes extends Record<string, any>, Path extends string> =
  | Uppercase<MethodsAtPath<Routes, Path>>
  | MethodsAtPath<Routes, Path>

type RouteInfoForMethod<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> =
  Lowercase<Method> extends keyof RouteAtPath<Routes, Path>
    ? RouteAtPath<Routes, Path>[Lowercase<Method>]
    : never

// ─── Options type ────────────────────────────────────────────────────────────

// Params option: required if path has :params, omitted otherwise
type ParamsOption<Path extends string> =
  ExtractParamsFromPath<Path> extends undefined
    ? { params?: Record<string, string> }
    : { params: ExtractParamsFromPath<Path> }

// Query option: typed from route schema if available
type QueryOption<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> =
  RouteInfoForMethod<Routes, Path, Method> extends {
    query: infer Q
  }
    ? undefined extends Q
      ? { query?: Record<string, unknown> }
      : { query: Q }
    : { query?: Record<string, unknown> }

// Body option: typed from route schema, only for non-GET/HEAD/SUBSCRIBE methods
type BodyOption<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> =
  Lowercase<Method> extends 'get' | 'head' | 'subscribe'
    ? {}
    : RouteInfoForMethod<Routes, Path, Method> extends {
          request: infer Body
        }
      ? undefined extends Body
        ? { body?: unknown }
        : { body: Body }
      : { body?: unknown }

// Check if options has any required fields
type HasRequiredFields<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> =
  // params required?
  ExtractParamsFromPath<Path> extends undefined
    ? // query required?
      RouteInfoForMethod<Routes, Path, Method> extends { query: infer Q }
      ? undefined extends Q
        ? // body required?
          Lowercase<Method> extends 'get' | 'head' | 'subscribe'
          ? false
          : RouteInfoForMethod<Routes, Path, Method> extends {
                request: infer Body
              }
            ? undefined extends Body
              ? false
              : true
            : false
        : true
      : // body required?
        Lowercase<Method> extends 'get' | 'head' | 'subscribe'
        ? false
        : RouteInfoForMethod<Routes, Path, Method> extends {
              request: infer Body
            }
          ? undefined extends Body
            ? false
            : true
          : false
    : true

type FetchOptionsTyped<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> = {
  method?: Method
  headers?: RequestInit['headers']
  signal?: AbortSignal
} & ParamsOption<Path> &
  QueryOption<Routes, Path, Method> &
  BodyOption<Routes, Path, Method>

type FetchOptionsFallback = {
  method?: string
  body?: BodyInit | Record<string, unknown> | null
  query?: Record<string, unknown>
  params?: Record<string, string>
  headers?: RequestInit['headers']
  signal?: AbortSignal
  [key: string]: unknown
}

type FetchOptions<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> = [RouteAtPath<Routes, Path>] extends [never]
  ? FetchOptionsFallback
  : FetchOptionsTyped<Routes, Path, Method>

// ─── Response type ───────────────────────────────────────────────────────────

type FetchResultData<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> = [RouteAtPath<Routes, Path>] extends [never]
  ? any
  : RouteInfoForMethod<Routes, Path, Method> extends {
        response: infer Res extends Record<number, unknown>
      }
    ? ReplaceGeneratorWithAsyncGenerator<Res>[200]
    : any

type FetchResultError<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> = [RouteAtPath<Routes, Path>] extends [never]
  ? SpiceflowFetchError<number, any>
  : RouteInfoForMethod<Routes, Path, Method> extends {
        response: infer Res extends Record<number, unknown>
      }
    ? Exclude<keyof Res, 200> extends never
      ? SpiceflowFetchError<number, any>
      : {
          [Status in keyof Res]: SpiceflowFetchError<Status, Res[Status]>
        }[Exclude<keyof Res, 200>]
    : SpiceflowFetchError<number, any>

type FetchResult<
  Routes extends Record<string, any>,
  Path extends string,
  Method extends string,
> =
  | FetchResultError<Routes, Path, Method>
  | FetchResultData<Routes, Path, Method>

// ─── Public type ─────────────────────────────────────────────────────────────

// Resolves options for a given App/Path/Method combination.
// Returns the appropriate options type, or FetchOptionsFallback for unknown paths.
type ResolveOptions<
  App extends AnySpiceflow,
  Path extends string,
  Method extends string,
> = App extends {
  _types: { ClientRoutes: infer Routes extends Record<string, any> }
}
  ? IsAny<Routes> extends true
    ? FetchOptionsFallback
    : FetchOptions<Routes, Path, Method>
  : FetchOptionsFallback

// Resolves the result type for a given App/Path/Method combination.
type ResolveResult<
  App extends AnySpiceflow,
  Path extends string,
  Method extends string,
> = App extends {
  _types: { ClientRoutes: infer Routes extends Record<string, any> }
}
  ? IsAny<Routes> extends true
    ? SpiceflowFetchError<number, any> | any
    : FetchResult<Routes, Path, Method>
  : SpiceflowFetchError<number, any> | any

// Check if options are required for a given App/Path/Method
type IsOptionsRequired<
  App extends AnySpiceflow,
  Path extends string,
  Method extends string,
> = App extends {
  _types: { ClientRoutes: infer Routes extends Record<string, any> }
}
  ? IsAny<Routes> extends true
    ? false
    : [RouteAtPath<Routes, Path>] extends [never]
      ? false
      : HasRequiredFields<Routes, Path, Method>
  : false

export interface SpiceflowFetch<App extends AnySpiceflow> {
  // Overload: options required when route demands params/query/body
  <const Path extends AppClientPaths<App>, const Method extends string = 'GET'>(
    ...args: IsOptionsRequired<App, Path, Method> extends true
      ? [path: Path, options: ResolveOptions<App, Path, Method>]
      : [path: Path, options?: ResolveOptions<App, Path, Method>]
  ): Promise<ResolveResult<App, Path, Method>>
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createSpiceflowFetch<const App extends AnySpiceflow>(
  domain: App | string,
  config: SpiceflowClient.Config &
    (App extends Spiceflow<any, any, infer Singleton, any, any, any, any>
      ? { state?: Singleton['state'] }
      : {}) = {} as any,
): SpiceflowFetch<App> {
  let baseUrl: string
  let instance: AnySpiceflow | undefined

  if (typeof domain === 'string') {
    baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain
  } else {
    baseUrl = 'http://e.ly'
    instance = domain

    if (typeof window !== 'undefined') {
      console.warn(
        'Spiceflow instance server found on client side, this is not recommended for security reason. Use generic type instead.',
      )
    }
  }

  if ((config as any).state && !instance) {
    throw new Error('State is only available when using a Spiceflow instance')
  }

  const spiceflowFetch = async (
    path: string,
    options: any = {},
  ): Promise<any> => {
    let {
      fetch: fetcher = fetch,
      headers: configHeaders,
      onRequest,
      onResponse,
      retries = 0,
    } = config as SpiceflowClient.Config

    const {
      method: rawMethod = 'GET',
      body,
      query,
      params,
      headers: optionHeaders,
      signal,
      ...restInit
    } = options

    const methodUpper = rawMethod.toUpperCase()
    const isGetOrHead =
      methodUpper === 'GET' ||
      methodUpper === 'HEAD' ||
      methodUpper === 'SUBSCRIBE'

    // Resolve path params (replace :param with values)
    // Sort by key length descending to avoid :id replacing inside :id2
    let resolvedPath = path
    if (params && typeof params === 'object') {
      const entries = Object.entries(params).sort(
        ([a], [b]) => b.length - a.length,
      )
      for (const [key, value] of entries) {
        if (key === '*') {
          resolvedPath = resolvedPath.split('*').join(String(value))
        } else {
          resolvedPath = resolvedPath.split(`:${key}`).join(String(value))
        }
      }
    }

    const queryString = buildQueryString(query)

    // Support absolute URLs — skip baseUrl concatenation
    const isAbsoluteUrl = /^https?:\/\//i.test(resolvedPath)
    const url = isAbsoluteUrl
      ? resolvedPath + queryString
      : baseUrl + resolvedPath + queryString

    let headers = processHeaders(configHeaders, resolvedPath, {
      method: methodUpper,
      signal,
    })
    headers = {
      ...headers,
      ...processHeaders(optionHeaders, resolvedPath, {
        method: methodUpper,
        signal,
      }),
    }

    let fetchInit: RequestInit = {
      method: methodUpper,
      headers,
      signal,
      ...restInit,
    }

    // Apply onRequest hooks (first pass, before body serialization)
    if (onRequest) {
      const hooks = Array.isArray(onRequest) ? onRequest : [onRequest]
      for (const hook of hooks) {
        const temp = await hook(resolvedPath, fetchInit)
        if (typeof temp === 'object') {
          fetchInit = {
            ...fetchInit,
            ...temp,
            headers: {
              ...fetchInit.headers,
              ...processHeaders(temp.headers, resolvedPath, fetchInit),
            },
          }
        }
      }
    }

    // Ensure GET/HEAD has no body before serialization
    if (isGetOrHead) delete fetchInit.body

    // Serialize body
    if (!isGetOrHead && body !== undefined) {
      fetchInit.body = body
      await serializeBody({ body, fetchInit, isGetOrHead })
    }

    if (isGetOrHead) {
      delete fetchInit.body
    }

    // Add x-spiceflow-agent header
    ;(fetchInit.headers as Record<string, string>)['x-spiceflow-agent'] =
      'spiceflow-client'

    // Apply onRequest hooks (second pass, after body serialization — matches proxy client behavior)
    if (onRequest) {
      const hooks = Array.isArray(onRequest) ? onRequest : [onRequest]
      for (const hook of hooks) {
        const temp = await hook(resolvedPath, fetchInit)
        if (typeof temp === 'object') {
          fetchInit = {
            ...fetchInit,
            ...temp,
            headers: {
              ...fetchInit.headers,
              ...processHeaders(temp.headers, resolvedPath, fetchInit),
            } as Record<string, string>,
          }
        }
      }
    }

    // Execute request with retries
    const executeRequest = () =>
      executeWithRetries({
        url,
        fetchInit,
        fetcher: fetcher || fetch,
        instance,
        state: (config as any).state,
        retries,
      })

    const response = await executeRequest()

    // Process onResponse hooks
    if (onResponse) {
      const hooks = Array.isArray(onResponse) ? onResponse : [onResponse]
      for (const hook of hooks) {
        await hook(response.clone())
      }
    }

    // Parse response
    const { data, error } = await parseResponseData({
      response,
      executeRequest,
      retries,
    })

    if (error) {
      error.response = response
      return error
    }

    return data
  }

  return spiceflowFetch as any
}
