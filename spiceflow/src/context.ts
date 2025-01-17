import type {
  StatusMap,
  InvertedStatusMap,
  redirect as Redirect,
} from './utils.js'

import type {
  RouteSchema,
  Prettify,
  ResolvePath,
  SingletonBase,
  HTTPHeaders,
} from './types.js'

import { SpiceflowRequest } from './spiceflow.js'

export type ErrorContext<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
    derive: {}
    resolve: {}
  },
  Path extends string = '',
> = Prettify<{
  // body: Route['body']
  query: undefined extends Route['query']
    ? Record<string, string | undefined>
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
  request: SpiceflowRequest<Route['body']>
  state: Singleton['state']
  // response: Route['response']
}>

export type Context<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
    derive: {}
    resolve: {}
  },
  Path extends string = '',
> = Prettify<{
  query: undefined extends Route['query']
    ? Record<string, string | undefined>
    : Route['query']
  params: undefined extends Route['params']
    ? Path extends `${string}/${':' | '*'}${string}`
      ? ResolvePath<Path>
      : never
    : Route['params']

  // server: Server | null
  redirect: Redirect

  path: string

  request: SpiceflowRequest<Route['body']>
  state: Singleton['state']
  // response?: Route['response']
}>

// Use to mimic request before mapping route
export type MiddlewareContext<
  in out Singleton extends SingletonBase = {
    state: {}
  },
> = Prettify<{
  state: Singleton['state']
  request: Request
  path: string
  query?: Record<string, string | undefined>
  params?: Record<string, string | undefined>

  redirect: Redirect
  // server: Server | null

  // set: {
  // 	headers: HTTPHeaders
  // 	status?: number
  // 	redirect?: string
  // }

  // error: typeof error
}>
