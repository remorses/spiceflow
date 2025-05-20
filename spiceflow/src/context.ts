import type { redirect as Redirect } from './utils.ts'

import type {
  RouteSchema,
  Prettify,
  ResolvePath,
  SingletonBase,
} from './types.ts'

import { SpiceflowRequest } from './spiceflow.ts'

export type ErrorContext<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
    derive: {}
    resolve: {}
  },
  Path extends string = '',
> = Prettify<
  Singleton & {
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
    // response: Route['response']
  }
>

export type Context<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
    derive: {}
    resolve: {}
  },
  Path extends string = '',
> = Prettify<
  Singleton & {
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
    // response?: Route['response']
  }
>

// Use to mimic request before mapping route
export type MiddlewareContext<
  in out Singleton extends SingletonBase = {
    state: {}
  },
> = Prettify<
  Singleton & {
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
  }
>
