import 'urlpattern-polyfill'

import { deepFreeze } from './utils.js'

import type {
	Handle,
	RoutesArray,
	RouterMethod,
	RouterOptions,
	HandleResponse,
	HandleResolve,
	HandleProps,
	Platform
} from './types.js'
import {
	SingletonBase,
	DefinitionBase,
	MetadataBase,
	RouteBase,
	EphemeralType,
	ComposeElysiaResponse,
	CreateEden,
	InlineHandler,
	InputSchema,
	JoinPath,
	LocalHook,
	MergeSchema,
	ResolvePath,
	UnwrapRoute
} from './elysia-fork/types.js'
import { MedleyRouter } from './router.js'

type P = any

/**
 * Router class
 */
export class Elysia<
	const in out BasePath extends string = '',
	const in out Scoped extends boolean = false,
	const in out Singleton extends SingletonBase = {
		decorator: {}
		store: {}
		derive: {}
		resolve: {}
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
	// ? scoped
	const in out Ephemeral extends EphemeralType = {
		derive: {}
		resolve: {}
		schema: {}
	},
	// ? local
	const in out Volatile extends EphemeralType = {
		derive: {}
		resolve: {}
		schema: {}
	}
> {
	onError: Exclude<RouterOptions<P>['onError'], undefined>
	onNoMatch: Exclude<RouterOptions<P>['onNoMatch'], undefined>

	router: MedleyRouter<any>
	/**
	 * Create a new Router
	 * @param options {@link RouterOptions} {@link Platform}
	 */
	constructor(options: RouterOptions<P> = {}) {
		// Setup default response handles
		this.onError =
			options.onError ?? (() => new Response(null, { status: 500 }))
		this.onNoMatch =
			options.onNoMatch ?? (() => new Response(null, { status: 404 }))

		// Setup route map
		this.router = new MedleyRouter()
		// Bind router methods
		// for (const method of METHODS) {
		// 	this.#routes.set(method as Method, [])
		// 	const key = method.toLowerCase() as Lowercase<Method>
		// 	this[key as any] = this.#add.bind(this, method)
		// }
	}

	/**
	 * ### post
	 * Register handler for path with method [POST]
	 *
	 * ---
	 * @example
	 * ```typescript
	 * import { Elysia, t } from 'elysia'
	 *
	 * new Elysia()
	 *     .post('/', () => 'hi')
	 *     .post('/with-hook', () => 'hi', {
	 *         response: t.String()
	 *     })
	 * ```
	 */
	post<
		const Path extends string,
		const LocalSchema extends InputSchema<
			keyof Definitions['type'] & string
		>,
		const Schema extends MergeSchema<
			UnwrapRoute<LocalSchema, Definitions['type']>,
			MergeSchema<
				Volatile['schema'],
				MergeSchema<Ephemeral['schema'], Metadata['schema']>
			>
		>,
		const Handle extends InlineHandler<
			Schema,
			Singleton & {
				derive: Ephemeral['derive'] & Volatile['derive']
				resolve: Ephemeral['resolve'] & Volatile['resolve']
			},
			JoinPath<BasePath, Path>
		>
	>(
		path: Path,
		handler: Handle,
		hook?: LocalHook<
			LocalSchema,
			Schema,
			Singleton & {
				derive: Ephemeral['derive'] & Volatile['derive']
				resolve: Ephemeral['resolve'] & Volatile['resolve']
			},
			Definitions['error'],
			Metadata['macro'],
			JoinPath<BasePath, Path>
		>
	): Elysia<
		BasePath,
		Scoped,
		Singleton,
		Definitions,
		Metadata,
		Routes &
			CreateEden<
				JoinPath<BasePath, Path>,
				{
					post: {
						body: Schema['body']
						params: undefined extends Schema['params']
							? ResolvePath<Path>
							: Schema['params']
						query: Schema['query']
						headers: Schema['headers']
						response: ComposeElysiaResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add('POST', path, handler as any, hook)

		return this as any
	}

	add(method: Method, pattern: string, handle: Handle<P>) {
		if (!method) {
			for (const m of METHODS) {
				this.add(m, pattern, handle)
			}
			return
		}
		this.router.add(method, pattern, handle)
	}

	/**
	 * Pass a request through all matching route handles and return a response
	 * @param request   The `Request`
	 * @param platform  Platform specific context {@link Platform}
	 * @returns The final `Response`
	 */
	async handle(request: Request, platform?: P): Promise<Response> {
		platform ??= {} as P
		try {
			let response: Response | undefined
			// Get all middleware and method specific routes in order
			let u = new URL(request.url)
			const route = this.router.match(
				request.method,
				u.pathname + u.search
			)
			if (!route) {
				console.log('no route')
				return this.onNoMatch(request, platform)
			}

			let routes = [route]
			// Pass request/response through each route
			for (const route of routes) {
				console.log(route)
				const res = route.handle({
					request,
					response,
					platform
				})
				return await turnHandlerResultIntoResponse(res)
			}
			return this.onNoMatch(request, platform)
		} catch (err) {
			return this.onError(err, request, platform)
		}
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
	'TRACE'
] as const

/** HTTP method string */
export type Method = (typeof METHODS)[number]

export async function turnHandlerResultIntoResponse(result: any) {
	// if user returns not a response, convert to json
	if (result instanceof Response) {
		return result
	}
	// if user returns a promise, await it
	if (result instanceof Promise) {
		result = await result
	}
	// // if user returns a string, convert to json
	// if (typeof result === 'string') {
	// 	result = new Response(result)
	// }
	// if user returns an object, convert to json

	return new Response(JSON.stringify(result))
}
