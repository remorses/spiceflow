import parseQuery from 'fast-querystring'

import { Type } from '@sinclair/typebox'

export { Type as t }

import {
	ComposeSpiceflowResponse,
	CreateEden,
	DefinitionBase,
	EphemeralType,
	ErrorHandler,
	Handler,
	HTTPMethod,
	InlineHandler,
	InputSchema,
	IsAny,
	JoinPath,
	LocalHook,
	MaybeArray,
	MergeSchema,
	MetadataBase,
	PreHandler,
	Prettify2,
	Reconcile,
	ResolvePath,
	RouteBase,
	RouteSchema,
	SingletonBase,
	TypeSchema,
	UnwrapRoute,
} from './elysia-fork/types.js'
import addFormats from 'ajv-formats'
let globalIndex = 0

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import OriginalRouter from '@medley/router'
import { TSchema } from '@sinclair/typebox'
import Ajv, { ValidateFunction } from 'ajv'
import { Context } from './elysia-fork/context.js'
import { isAsyncIterable } from './utils.js'
import { redirect } from './elysia-fork/utils.js'
import { ValidationError } from './elysia-fork/error.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { z, ZodType } from 'zod'

const ajv = (addFormats.default || addFormats)(
	new (Ajv.default || Ajv)({ useDefaults: true }),
	[
		'date-time',
		'time',
		'date',
		'email',
		'hostname',
		'ipv4',
		'ipv6',
		'uri',
		'uri-reference',
		'uuid',
		'uri-template',
		'json-pointer',
		'relative-json-pointer',
		'regex',
	],
)

// Should be exported from `hono/router`

type P = any

type AsyncResponse = Response | Promise<Response>

type OnError = (x: { error: any; request: Request }) => AsyncResponse

type RouterTree = {
	id: number
	router: OriginalRouter
	prefix?: string
	onRequestHandlers: Function[]
	onErrorHandlers: OnError[]
	children: RouterTree[]
	routes: InternalRoute[]
	// default store for the router, used as default for context.store
	store: Record<any, any>
	currentRoot?: RouterTree
}

type OnNoMatch = (request: Request, platform: P) => AsyncResponse

export type InternalRoute = {
	method: HTTPMethod
	path: string
	handler: InlineHandler<any, any, any>
	hooks: LocalHook<any, any, any, any, any, any, any>
	validateBody?: ValidateFunction
	validateQuery?: ValidateFunction
	validateParams?: ValidateFunction

	prefix: string

	// store: Record<any, any>
}
/**
 * Router class
 */
export class Spiceflow<
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
	},
> {
	private onNoMatch: OnNoMatch
	// prefix: BasePath | undefined
	private routerTree: RouterTree

	getAllRoutes() {
		let root = this.routerTree.currentRoot || this.routerTree
		const allApps = bfs(root) || []
		const allRoutes = allApps.flatMap((x) => {
			const prefix = this.getRouteAndParents(x)
				.map((x) => x.prefix)
				.reverse()
				.join('')

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
		const router = this.routerTree
		// if (router.prefix) {
		// 	path = router.prefix + path
		// }

		let bodySchema: TypeSchema = hooks?.body
		let validateBody = getValidateFunction(bodySchema)
		let validateQuery = getValidateFunction(hooks?.query)
		let validateParams = getValidateFunction(hooks?.params)

		const store = router.router.register(path)
		let route: InternalRoute = {
			...rest,

			prefix: router.prefix || '',
			method: (method || '') as any,
			path: path || '',
			// prefix,
			handler: handler!,
			hooks,
			validateBody,
			validateParams,
			validateQuery,
		}
		router.routes.push(route)
		store[method] = route
	}

	private match(method: string, path: string) {
		let root = this.routerTree
		const result = bfsFind(this.routerTree, (router) => {
			router.currentRoot = root
			let prefix = this.getRouteAndParents(router)
				.map((x) => x.prefix)
				.reverse()
				.join('')
			if (prefix && !path.startsWith(prefix)) {
				// console.log(
				// 	`router prefix: ${router.prefix} does not match path: ${path}`
				// )
				return
			}
			let pathWithoutPrefix = path
			if (prefix) {
				pathWithoutPrefix = path.replace(prefix, '')
			}
			// console.log(`router prefix: ${router.prefix} matches path: ${path}`)
			const route = router.router.find(pathWithoutPrefix)
			if (!route) {
				return
			}

			let data: InternalRoute = route['store'][method]
			if (data) {
				// console.log(`route found: ${method} ${path}`, route)

				const { onErrorHandlers, onRequestHandlers } = router
				const params = route['params'] || {}

				return {
					...data,
					router,
					store: router.store,
					onErrorHandlers,
					onRequestHandlers,
					params,
				}
			}
		})

		return result
	}

	state<const Name extends string | number | symbol, Value>(
		name: Name,
		value: Value,
	): Spiceflow<
		BasePath,
		Scoped,
		{
			decorator: Singleton['decorator']
			store: Reconcile<
				Singleton['store'],
				{
					[name in Name]: Value
				}
			>
			derive: Singleton['derive']
			resolve: Singleton['resolve']
		},
		Definitions,
		Metadata,
		Routes,
		Ephemeral,
		Volatile
	> {
		this.routerTree.store[name] = value
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
			onNoMatch?: (request: Request, platform: P) => AsyncResponse
			basePath?: BasePath
		} = {},
	) {
		this.scoped = options.scoped

		this.onNoMatch =
			options.onNoMatch ?? (() => new Response(null, { status: 404 }))
		this.routerTree = {
			id: globalIndex++,
			router: new OriginalRouter(),
			prefix: options.basePath,
			onRequestHandlers: [],
			onErrorHandlers: [],
			children: [],
			store: {},
			routes: [],
		}

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
		Metadata: {} as Metadata,
	}

	_ephemeral = {} as Ephemeral
	_volatile = {} as Volatile

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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add({ method: 'POST', path, handler: handler, hooks: hook })

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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add({ method: 'GET', path, handler: handler, hooks: hook })
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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add({ method: 'PUT', path, handler: handler, hooks: hook })

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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add({ method: 'PATCH', path, handler: handler, hooks: hook })

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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add({ method: 'DELETE', path, handler: handler, hooks: hook })

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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add({ method: 'OPTIONS', path, handler: handler, hooks: hook })

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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
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
			this.add({ method, path, handler: handler, hooks: hook })
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
		>,
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
		>,
	): Spiceflow<
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

						response: ComposeSpiceflowResponse<
							Schema['response'],
							Handle
						>
					}
				}
			>,
		Ephemeral,
		Volatile
	> {
		this.add({ method: 'HEAD', path, handler: handler, hooks: hook })

		return this as any
	}

	/**
	 * If set to true, other Spiceflow handler will not inherits global life-cycle, store, decorators from the current instance
	 *
	 * @default false
	 */
	private scoped?: Scoped
	get _scoped() {
		return this.scoped as Scoped
	}

	// group is not needed, you can add another prefixed app instead
	// group<
	// 	const Prefix extends string,
	// 	const NewSpiceflow extends Spiceflow<any, any, any, any, any, any, any, any>
	// >(
	// 	prefix: Prefix,
	// 	run: (
	// 		group: Spiceflow<
	// 			`${BasePath}${Prefix}`,
	// 			Scoped,
	// 			Singleton,
	// 			Definitions,
	// 			Metadata,
	// 			{},
	// 			Ephemeral,
	// 			Volatile
	// 		>
	// 	) => NewSpiceflow
	// ): Spiceflow<
	// 	BasePath,
	// 	Scoped,
	// 	Singleton,
	// 	Definitions,
	// 	Metadata,
	// 	Prettify<Routes & NewSpiceflow['_routes']>,
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
					? Routes & NewSpiceflow['_routes']
					: Routes & CreateEden<BasePath, NewSpiceflow['_routes']>,
				Ephemeral,
				Volatile
		  > {
		const thisRouter = this.routerTree
		// TODO use scoped logic to add onRequest and onError on all routers if necessary, add them first
		this.routerTree.children.push(instance.routerTree)
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
		>,
	): this {
		const router = this.routerTree

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
		>,
	) {
		const router = this.routerTree
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

		let u = new URL(request.url, 'http://localhost')
		let path = u.pathname + u.search
		const defaultContext = {
			redirect,
			error: null,
			path,
		}
		let onErrorHandlers: OnError[] = []
		try {
			let response: Response | undefined
			// Get all middleware and method specific routes in order

			const route = this.match(request.method, path)
			if (!route) {
				return this.onNoMatch(request, platform)
			}
			onErrorHandlers = this.getRouteAndParents(route.router)
				.reverse()
				.flatMap((x) => x.onErrorHandlers)
			let { params, store: defaultStore } = route
			const onReqHandlers = this.getRouteAndParents(route.router)
				.reverse()
				.flatMap((x) => x.onRequestHandlers)
			// console.log({ onReqHandlers })
			let store = { ...defaultStore }
			// TODO add content type

			let content = route?.hooks?.content
			// let body = await getRequestBody({ request, content })

			if (route.validateBody) {
				// TODO don't clone the request
				let typedRequest = new TypedRequest(request)
				typedRequest.validateBody = route.validateBody
				request = typedRequest
			}

			let query = parseQuery.parse((u.search || '').slice(1))

			if (onReqHandlers.length > 0) {
				for (const handler of onReqHandlers) {
					const res = await handler({
						request,
						response,
						store,
						path,
						query,
					} satisfies Context<any, any, any>)
					if (res) {
						return await turnHandlerResultIntoResponse(res)
					}
				}
			}

			query = runValidation(query, route.validateQuery)
			params = runValidation(params, route.validateParams)

			// console.log(route)

			const res = route.handler({
				...defaultContext,
				request,
				response,
				params: params as any,
				store,
				query,
				// body,
				path,

				// platform
			} satisfies Context<any, any, string>)
			if (isAsyncIterable(res)) {
				return await this.handleStream({
					generator: res,
					request,
					onErrorHandlers,
				})
			}

			return await turnHandlerResultIntoResponse(res)
		} catch (err: any) {
			if (err instanceof Response) return err
			let res = await this.runErrorHandlers({
				onErrorHandlers,
				error: err,
				request,
			})
			if (res) return res
			let status = err?.status ?? 500
			return new Response(err?.message || 'Internal Server Error', {
				status,
			})
		}
	}

	private async runErrorHandlers({
		onErrorHandlers = [] as OnError[],
		error: err,
		request,
	}) {
		if (onErrorHandlers.length === 0) {
			console.error(`Spiceflow unhandled error:`, err)
		} else {
			for (const errHandler of onErrorHandlers) {
				const res = errHandler({ error: err, request })
				if (res instanceof Response) {
					return res
				}
			}
		}
	}

	// get the route parents, the order is starting from the current router and going up to the root
	private getRouteAndParents(currentRouter?: RouterTree) {
		const parents: RouterTree[] = []
		let current = currentRouter

		let root = this.routerTree.currentRoot || this.routerTree
		// Perform BFS once to build a parent map
		const parentMap = new Map<number, RouterTree>()
		bfsFind(root, (node) => {
			for (const child of node.children) {
				parentMap.set(child.id, node)
			}
		})

		// Traverse the parent map to get the parents
		while (current) {
			parents.push(current)
			current = parentMap.get(current.id)
		}

		return parents.filter((x) => x !== undefined)
	}

	private async handleStream({
		onErrorHandlers,
		generator,
		request,
	}: {
		generator: Generator | AsyncGenerator
		onErrorHandlers: OnError[]
		request: Request
	}) {
		let init = generator.next()
		if (init instanceof Promise) init = await init

		if (init?.done) {
			return await turnHandlerResultIntoResponse(init.value)
		}
		// let errorHandlers = this.routerTree.onErrorHandlers
		let self = this
		return new Response(
			new ReadableStream({
				async start(controller) {
					let end = false

					request?.signal.addEventListener('abort', () => {
						end = true

						try {
							controller.close()
						} catch {
							// nothing
						}
					})

					if (init?.value !== undefined && init?.value !== null)
						controller.enqueue(
							Buffer.from(
								`event: message\ndata: ${JSON.stringify(
									init.value,
								)}\n\n`,
							),
						)

					try {
						for await (const chunk of generator) {
							if (end) break
							if (chunk === undefined || chunk === null) continue

							controller.enqueue(
								Buffer.from(
									`event: message\ndata: ${JSON.stringify(
										chunk,
									)}\n\n`,
								),
							)
						}
					} catch (error: any) {
						let res = await self.runErrorHandlers({
							onErrorHandlers: onErrorHandlers,
							error,
							request,
						})
						controller.enqueue(
							Buffer.from(
								`event: error\ndata: ${JSON.stringify(
									error.message || error.name || 'Error',
								)}\n\n`,
							),
						)
					}

					try {
						controller.close()
					} catch {
						// nothing
					}
				},
			}),
			{
				// TODO add headers somehow
				headers: {
					// Manually set transfer-encoding for direct response, eg. app.handle, eden
					'transfer-encoding': 'chunked',
					'content-type': 'text/event-stream; charset=utf-8',
					// ...set?.headers
				},
			},
		)
	}
}

// async function getRequestBody({
// 	request,
// 	content,
// }: {
// 	content
// 	request: Request
// }) {
// 	let body: string | Record<string, any> | undefined
// 	if (request.method === 'GET' || request.method === 'HEAD') {
// 		return
// 	}

// 	const contentType =
// 		content || request.headers.get('content-type')?.split(';')?.[0]

// 	if (!contentType) {
// 		return
// 	}

// 	switch (contentType) {
// 		case 'application/json':
// 			body = (await request.json()) as any
// 			break

// 		case 'text/plain':
// 			body = await request.text()
// 			break

// 		case 'application/x-www-form-urlencoded':
// 			body = parseQuery.parse(await request.text()) as any
// 			break

// 		case 'application/octet-stream':
// 			body = await request.arrayBuffer()
// 			break

// 		case 'multipart/form-data':
// 			body = {}

// 			const form = await request.formData()
// 			for (const key of form.keys()) {
// 				if (body[key]) continue

// 				const value = form.getAll(key)
// 				if (value.length === 1) body[key] = value[0]
// 				else body[key] = value
// 			}

// 			break
// 	}

// 	return body
// }

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
	tree: RouterTree,
	onNode: (node: RouterTree) => T | undefined | void,
): T | undefined {
	const queue = [tree]

	while (queue.length > 0) {
		const node = queue.shift()!

		const result = onNode(node)
		if (result) {
			return result
		}
		queue.push(...node.children)
	}
	return
}
export class TypedRequest<T = any> extends Request {
	validateBody?: ValidateFunction

	async json(): Promise<T> {
		const body = (await super.json()) as Promise<T>
		return runValidation(body, this.validateBody)
	}
}

export function bfs(tree: RouterTree) {
	const queue = [tree]
	let nodes: RouterTree[] = []
	while (queue.length > 0) {
		const node = queue.shift()!
		if (node) {
			nodes.push(node)
		}
		// const result = onNode(node)

		queue.push(...node.children)
	}
	return nodes
}
function mapTree<T>(
	tree: RouterTree,
	mapper: (node: RouterTree) => T,
): T & { children: (T & { children: any[] })[] } {
	const mappedNode = mapper(tree) as T & { children: any[] }
	mappedNode.children = tree.children.map((child) => mapTree(child, mapper))
	return mappedNode
}

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

	return new Response(JSON.stringify(result, null, 2), {
		headers: {
			'content-type': 'application/json',
		},
	})
}

export type AnySpiceflow = Spiceflow<any, any, any, any, any, any, any, any>

export function isZodSchema(value: unknown): value is ZodType {
	return (
		value instanceof z.ZodType ||
		(typeof value === 'object' &&
			value !== null &&
			'parse' in value &&
			'safeParse' in value &&
			'optional' in value &&
			'nullable' in value)
	)
}

function getValidateFunction(schema: TypeSchema) {
	if (isZodSchema(schema)) {
		let jsonSchema = zodToJsonSchema(schema, {})
		return ajv.compile(jsonSchema)
	}

	if (schema) {
		return ajv.compile(schema)
	}
}

function runValidation(value: any, validate?: ValidateFunction) {
	if (!validate) return value
	const valid = validate(value)
	if (!valid) {
		const error = ajv.errorsText(validate.errors, {
			separator: '\n',
		})
		throw new ValidationError(error)
	}
	return value
}
