import type { StatusMap, InvertedStatusMap } from './utils.js'

import type {
  RouteSchema,
  Prettify,
  ResolvePath,
  SingletonBase,
  HTTPHeaders,
  GetRequestSchema,
} from './types.js'

import { SpiceflowRequest, WaitUntil } from './spiceflow.js'
import type { SpiceflowSpan, SpiceflowTracer } from './instrumentation.js'

type Redirect = (location: string, options?: {
  status?: number
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
}) => Response

// Mutable response object passed to page, layout, and API handlers via
// context.response. Unlike the Web Response class (whose status is readonly),
// this lets handlers set both headers and status directly:
//   response.headers.set('cache-control', 'private')
//   response.status = 404
export interface ContextResponse {
  headers: Headers
  status: number
}

export type ErrorContext<
  Path extends string = '',
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
    derive: {}
    resolve: {}
  },
> = Prettify<{
  // body: Route['body']
  query: undefined extends Route['query']
    ? Record<string, string>
    : Route['query']
  params: undefined extends Route['params']
    ? Path extends `${string}/${':' | '*'}${string}`
      ? ResolvePath<Path>
      : { [key in string]: string }
    : Route['params']

  // server: Server | null
  redirect: Redirect

  /**
   * Path extracted from incoming URL
   *
   * Represent a value extracted from URL
   *
   * @example '/id/9'
   */
  path: string
  /**
   * Path as registered to router
   *
   * Represent a path registered to a router, not a URL
   *
   * @example '/id/:id'
   */
  // route: string
  request: SpiceflowRequest<GetRequestSchema<Route>>
  state: Singleton['state']
  waitUntil: WaitUntil
  span: SpiceflowSpan
  tracer: SpiceflowTracer
  // response: Route['response']
}>

export type SpiceflowContext<
  Path extends string = '',
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
    derive: {}
    resolve: {}
  },
  LoaderData = {},
> = Prettify<{
  query: undefined extends Route['query']
    ? Record<string, string>
    : Route['query']
  params: undefined extends Route['params']
    ? Path extends `${string}/${':' | '*'}${string}`
      ? ResolvePath<Path>
      : never
    : Route['params']

  // server: Server | null
  redirect: Redirect

  path: string

  request: SpiceflowRequest<GetRequestSchema<Route>>
  state: Singleton['state']
  waitUntil: WaitUntil
  response: ContextResponse
  loaderData: LoaderData
  span: SpiceflowSpan
  tracer: SpiceflowTracer
  // TODO remove this for api routes
  children?: any
  // response?: Route['response']
}>

// Use to mimic request before mapping route
export type MiddlewareContext<
  in out Singleton extends SingletonBase = {
    state: {}
  },
> = Prettify<{
  state: Singleton['state']
  request: SpiceflowRequest
  path: string
  query?: Record<string, string | undefined>
  params?: Record<string, string | undefined>
  waitUntil: WaitUntil
  span: SpiceflowSpan
  tracer: SpiceflowTracer

  redirect: Redirect
  // server: Server | null

  // set: {
  // 	headers: HTTPHeaders
  // 	status?: number
  // 	redirect?: string
  // }

  // error: typeof error
}>
