import 'urlpattern-polyfill'

import { deepFreeze } from './utils.js'

import type {
	Handle,
	RoutesArray,
	RouterMethod,
	HandleResponse,
	HandleResolve,
	HandleProps,
	Platform,
	AsyncResponse
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
	UnwrapRoute,
	Prettify2,
	Prettify,
	MaybeArray,
	PreHandler,
	RouteSchema,
	ErrorHandler
} from './elysia-fork/types.js'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import OriginalRouter from '@medley/router'
// Should be exported from `hono/router`

type P = any

type OnError = (error: unknown, request: Request, platform: P) => AsyncResponse

type Router = {
	router: OriginalRouter
	prefix?: string
	onRequestHandlers: Function[]
	onErrorHandlers: OnError[]
}

type OnNoMatch = (request: Request, platform: P) => AsyncResponse
/**
 * Router class
 */
export class Elysia<
	const in out BasePath extends string = '',
	const in out Scoped extends boolean = true,
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
	private onNoMatch: OnNoMatch
	// prefix: BasePath | undefined
	routers: Router[] = []

	add({
		handler,
		method,
		path
	}: {
		method: string
		path: string
		hook: any
		handler: any
	}) {
		const router = this.routers[0]
		if (router.prefix) {
			path = router.prefix + path
		}

		const store = router.router.register(path)
		store[method] = { handler }
	}

	match(method: string, path: string) {
		for (const router of this.routers) {
			if (router.prefix && !path.startsWith(router.prefix)) {
				// console.log(
				// 	`router prefix: ${router.prefix} does not match path: ${path}`
				// )
				continue
			}
			// console.log(`router prefix: ${router.prefix} matches path: ${path}`)
			const route = router.router.find(path)
			if (!route) {
				continue
			}

			let data = route['store'][method]
			if (data) {
				// console.log(`route found: ${method} ${path}`, route)
				const { handler, hook } = data
				const { onErrorHandlers, onRequestHandlers } = router
				const params = route['params'] || {}
				return {
					handler,
					hook,
					onErrorHandlers,
					onRequestHandlers,
					params
				}
			}
		}

		return null
	}

	/**
	 * Create a new Router
	 * @param options {@link RouterOptions} {@link Platform}
	 */
	constructor(
		options: {
			/** Fallback handle if an error is thrown (500 response is default) */
			// onError?: OnError
			scoped?: Scoped
			onNoMatch?: (request: Request, platform: P) => AsyncResponse
			basePath?: BasePath
		} = {}
	) {
		this.scoped = options.scoped

		this.onNoMatch =
			options.onNoMatch ?? (() => new Response(null, { status: 404 }))
		this.routers.push({
			router: new OriginalRouter(),
			prefix: options.basePath,
			onRequestHandlers: [],
			onErrorHandlers: []
		})

		// Bind router methods
		// for (const method of METHODS) {
		// 	this.#routes.set(method as Method, [])
		// 	const key = method.toLowerCase() as Lowercase<Method>
		// 	this[key as any] = this.#add.bind(this, method)
		// }
	}

	_routes: Routes = {} as any

	_types = {
		Prefix: '' as BasePath,
		Scoped: false as Scoped,
		Singleton: {} as Singleton,
		Definitions: {} as Definitions,
		Metadata: {} as Metadata
	}

	_ephemeral = {} as Ephemeral
	_volatile = {} as Volatile

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
		this.add({ method: 'POST', path, handler: handler, hook })

		return this as any
	}

	get<
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
		const Macro extends Metadata['macro'],
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
			Macro,
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
					get: {
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
		this.add({ method: 'GET', path, handler: handler, hook })
		return this as any
	}

	put<
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
					put: {
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
		this.add({ method: 'PUT', path, handler: handler, hook })

		return this as any
	}

	patch<
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
					patch: {
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
		this.add({ method: 'PATCH', path, handler: handler, hook })

		return this as any
	}

	delete<
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
					delete: {
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
		this.add({ method: 'DELETE', path, handler: handler, hook })

		return this as any
	}

	options<
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
					options: {
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
		this.add({ method: 'OPTIONS', path, handler: handler, hook })

		return this as any
	}

	all<
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
					[method in string]: {
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
		for (const method of METHODS) {
			this.add({ method, path, handler: handler, hook })
		}

		return this as any
	}

	head<
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
					head: {
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
		this.add({ method: 'HEAD', path, handler: handler, hook })

		return this as any
	}

	/**
	 * If set to true, other Elysia handler will not inherits global life-cycle, store, decorators from the current instance
	 *
	 * @default false
	 */
	scoped?: Scoped
	get _scoped() {
		return this.scoped as Scoped
	}

	// group is not needed, you can add another prefixed app instead
	// group<
	// 	const Prefix extends string,
	// 	const NewElysia extends Elysia<any, any, any, any, any, any, any, any>
	// >(
	// 	prefix: Prefix,
	// 	run: (
	// 		group: Elysia<
	// 			`${BasePath}${Prefix}`,
	// 			Scoped,
	// 			Singleton,
	// 			Definitions,
	// 			Metadata,
	// 			{},
	// 			Ephemeral,
	// 			Volatile
	// 		>
	// 	) => NewElysia
	// ): Elysia<
	// 	BasePath,
	// 	Scoped,
	// 	Singleton,
	// 	Definitions,
	// 	Metadata,
	// 	Prettify<Routes & NewElysia['_routes']>,
	// 	Ephemeral,
	// 	Volatile
	// > {
	// 	let thisRouter = this.routers[0]
	// 	this.routers.push(
	// 		...instance.routers.map((r) => ({
	// 			...r,
	// 			prefix: (thisRouter.prefix || '') + r.prefix
	// 		}))
	// 	)

	// 	return this
	// }

	use<const NewElysia extends AnyElysia>(
		instance: NewElysia
	): NewElysia['_scoped'] extends false
		? Elysia<
				BasePath,
				Scoped,
				// @ts-expect-error - This is truly ideal
				Prettify2<Singleton & NewElysia['_types']['Singleton']>,
				Prettify2<Definitions & NewElysia['_types']['Definitions']>,
				Prettify2<Metadata & NewElysia['_types']['Metadata']>,
				BasePath extends ``
					? Routes & NewElysia['_routes']
					: Routes & CreateEden<BasePath, NewElysia['_routes']>,
				Ephemeral,
				Prettify2<Volatile & NewElysia['_ephemeral']>
		  >
		: Elysia<
				BasePath,
				Scoped,
				Singleton,
				Definitions,
				Metadata,
				BasePath extends ``
					? Routes & NewElysia['_routes']
					: Routes & CreateEden<BasePath, NewElysia['_routes']>,
				Ephemeral,
				Volatile
		  > {
		const thisRouter = this.routers[0]
		// TODO use scoped logic to add onRequest and onError on all routers if necessary, add them first
		this.routers.push(
			...instance.routers.map((r) => {
				return {
					...r,
					prefix: (thisRouter.prefix || '') + r.prefix
				}
			})
		)
		return this as any
	}

	onError<const Schema extends RouteSchema>(
		handler: MaybeArray<
			ErrorHandler<
				Definitions['error'],
				MergeSchema<
					Schema,
					MergeSchema<
						Volatile['schema'],
						MergeSchema<Ephemeral['schema'], Metadata['schema']>
					>
				>,
				Singleton,
				Ephemeral,
				Volatile
			>
		>
	): this {
		const router = this.routers[0]

		router.onErrorHandlers ??= []
		router.onErrorHandlers.push(handler as any)

		return this
	}

	onRequest<const Schema extends RouteSchema>(
		handler: MaybeArray<
			PreHandler<
				MergeSchema<
					Schema,
					MergeSchema<
						Volatile['schema'],
						MergeSchema<Ephemeral['schema'], Metadata['schema']>
					>
				>,
				{
					decorator: Singleton['decorator']
					store: Singleton['store']
					derive: {}
					resolve: {}
				}
			>
		>
	) {
		const router = this.routers[0]
		router.onRequestHandlers ??= []
		router.onRequestHandlers.push(handler as any)

		return this
	}
	/**
	 * Pass a request through all matching route handles and return a response
	 * @param request   The `Request`
	 * @param platform  Platform specific context {@link Platform}
	 * @returns The final `Response`
	 */
	async handle(request: Request, platform?: P): Promise<Response> {
		platform ??= {} as P
		let onErrorHandlers: OnError[] = []
		try {
			let response: Response | undefined
			// Get all middleware and method specific routes in order
			let u = new URL(request.url)
			const route = this.match(request.method, u.pathname + u.search)
			if (!route) {
				return this.onNoMatch(request, platform)
			}
			onErrorHandlers = route.onErrorHandlers
			const onReq = route.onRequestHandlers
			if (onReq.length > 0) {
				for (const handler of onReq) {
					const res = await handler({
						request,
						response,
						platform
					})
					if (res) {
						return await turnHandlerResultIntoResponse(res)
					}
				}
			}

			let routes = [route]

			for (const route of routes) {
				// console.log(route)
				const { params } = route
				const res = route.handler({
					request,
					response,
					params,
					platform
				})
				return await turnHandlerResultIntoResponse(res)
			}
			return this.onNoMatch(request, platform)
		} catch (err: any) {
			if (onErrorHandlers.length === 0) {
				console.error(`Spiceflow unhandled error:`, err)
			} else {
				for (const handler of onErrorHandlers) {
					const res = handler(err, request, platform)
					if (res instanceof Response) {
						return res
					}
				}
			}
			return new Response(err?.message || 'Internal Server Error', {
				status: 500
			})
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

export type AnyElysia = Elysia<any, any, any, any, any, any, any, any>
