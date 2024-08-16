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

import { TypedRequest } from '../spiceflow.js'

type InvertedStatusMapKey = keyof InvertedStatusMap

// type WithoutNullableKeys<Type> = {
// 	[Key in keyof Type]-?: NonNullable<Type[Key]>
// }

export type ErrorContext<
	in out Route extends RouteSchema = {},
	in out Singleton extends SingletonBase = {
		decorator: {}
		store: {}
		derive: {}
		resolve: {}
	},
	Path extends string = '',
> = Prettify<
	{
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
		request: TypedRequest<Route['body']>
		store: Singleton['store']
		// response: Route['response']
	} & Singleton['decorator'] &
		Singleton['derive'] &
		Singleton['resolve']
>

export type Context<
	in out Route extends RouteSchema = {},
	in out Singleton extends SingletonBase = {
		decorator: {}
		store: {}
		derive: {}
		resolve: {}
	},
	Path extends string = '',
> = Prettify<
	{
		// body: Route['body']
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

		// set: {
		// 	headers: HTTPHeaders
		// 	status?: number | keyof StatusMap
		// 	/**
		// 	 * @deprecated Use inline redirect instead
		// 	 *
		// 	 * Will be removed in 1.2.0
		// 	 *
		// 	 * @example Migration example
		// 	 * ```ts
		// 	 * new Spiceflow()
		// 	 *     .get(({ redirect }) => redirect('/'))
		// 	 * ```
		// 	 */
		// 	redirect?: string
		// 	/**
		// 	 * ! Internal Property
		// 	 *
		// 	 * Use `Context.cookie` instead
		// 	 */
		// 	cookie?: Record<string, SpiceflowCookie>
		// }

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
		route: string
		request: TypedRequest<Route['body']>
		store: Singleton['store']
		response?: Route['response']
	} & Singleton['decorator'] &
		Singleton['derive'] &
		Singleton['resolve']
>

// Use to mimic request before mapping route
export type PreContext<
	in out Singleton extends SingletonBase = {
		decorator: {}
		store: {}
		derive: {}
		resolve: {}
	},
> = Prettify<
	{
		store: Singleton['store']
		request: Request

		redirect: Redirect
		// server: Server | null

		// set: {
		// 	headers: HTTPHeaders
		// 	status?: number
		// 	redirect?: string
		// }

		// error: typeof error
	} & Singleton['decorator']
>
