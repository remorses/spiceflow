/* eslint-disable @typescript-eslint/ban-ts-comment */
import { JSONSchemaType } from 'ajv'
import { InternalRoute, Spiceflow } from '.'

import type { OpenAPIV3 } from 'openapi-types'

let excludeMethods = ['OPTIONS']
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { HTTPMethod, LocalHook, TypeSchema } from './elysia-fork/types'

import { Kind, type TSchema } from '@sinclair/typebox'

import deepClone from 'lodash.clonedeep'
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'

export const toOpenAPIPath = (path: string) =>
	path
		.split('/')
		.map((x) => {
			if (x.startsWith(':')) {
				x = x.slice(1, x.length)
				if (x.endsWith('?')) x = x.slice(0, -1)
				x = `{${x}}`
			}

			return x
		})
		.join('/')

export const mapProperties = (
	name: string,
	schema: TypeSchema | string | undefined,
	models: Record<string, TypeSchema>,
) => {
	if (schema === undefined) return []

	if (typeof schema === 'string')
		if (schema in models) schema = models[schema]
		else throw new Error(`Can't find model ${schema}`)

	let jsonSchema = getJsonSchema(schema)

	return Object.entries(jsonSchema?.properties ?? []).map(([key, value]) => {
		const {
			type: valueType = undefined,
			description,
			examples,
			...schemaKeywords
		} = value as any
		return {
			// @ts-ignore
			description,
			examples,
			schema: { type: valueType, ...schemaKeywords },
			in: name,
			name: key,

			required: jsonSchema!.required?.includes(key) ?? false,
		}
	})
}

const mapTypesResponse = (
	types: string[],
	schema:
		| string
		| {
				type: string
				properties: Object
				required: string[]
		  },
) => {
	if (
		typeof schema === 'object' &&
		['void', 'undefined', 'null'].includes(schema.type)
	)
		return

	const responses: Record<string, OpenAPIV3.MediaTypeObject> = {}

	for (const type of types)
		responses[type] = {
			schema:
				typeof schema === 'string'
					? {
							$ref: `#/components/schemas/${schema}`,
					  }
					: { ...(schema as any) },
		}

	return responses
}

export const capitalize = (word: string) =>
	word.charAt(0).toUpperCase() + word.slice(1)

export const generateOperationId = (method: string, paths: string) => {
	let operationId = method.toLowerCase()

	if (paths === '/') return operationId + 'Index'

	for (const path of paths.split('/')) {
		if (path.charCodeAt(0) === 123) {
			operationId += 'By' + capitalize(path.slice(1, -1))
		} else {
			operationId += capitalize(path)
		}
	}

	return operationId
}

export const registerSchemaPath = ({
	schema,
	path,
	method,
	hook,
	models,
}: {
	schema: Partial<OpenAPIV3.PathsObject>
	contentType?: string | string[]
	path: string
	method: HTTPMethod
	hook?: LocalHook<any, any, any, any, any, any, any>
	models: Record<string, TypeSchema>
}) => {
	if (hook) hook = deepClone(hook)

	// TODO if a route uses an async generator, add text/event-stream. if a roue does not add an explicit schema, use all possible content types
	const contentType = hook?.type ?? [
		'application/json',
		// 'multipart/form-data',
		// 'text/plain',
	]

	path = toOpenAPIPath(path)

	const contentTypes =
		typeof contentType === 'string'
			? [contentType]
			: contentType ?? ['application/json']

	const bodySchema = hook?.body
	const paramsSchema = hook?.params
	// const headerSchema = hook?.headers
	const querySchema = hook?.query
	let responseSchema = hook?.response as unknown as OpenAPIV3.ResponsesObject

	if (typeof responseSchema === 'object') {
		if (Kind in responseSchema) {
			const {
				type,
				properties,
				required,
				additionalProperties,
				patternProperties,
				...rest
			} = responseSchema as typeof responseSchema & {
				type: string
				properties: Object
				required: string[]
			}

			responseSchema = {
				'200': {
					...rest,
					description: rest.description as any,
					content: mapTypesResponse(
						contentTypes,
						type === 'object' || type === 'array'
							? ({
									type,
									properties,
									patternProperties,
									items: responseSchema.items,
									required,
							  } as any)
							: responseSchema,
					),
				},
			}
		} else {
			Object.entries(responseSchema as Record<string, TSchema>).forEach(
				([key, value]) => {
					if (typeof value === 'string') {
						if (!models[value]) return

						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const {
							type,
							properties,
							required,
							additionalProperties: _1,
							patternProperties: _2,
							...rest
						} = models[value] as TSchema & {
							type: string
							properties: Object
							required: string[]
						}

						responseSchema[key] = {
							...rest,
							description: rest.description as any,
							content: mapTypesResponse(contentTypes, value),
						}
					} else {
						const {
							type,
							properties,
							required,
							additionalProperties,
							patternProperties,
							...rest
						} = value as typeof value & {
							type: string
							properties: Object
							required: string[]
						}

						responseSchema[key] = {
							...rest,
							description: rest.description as any,
							content: mapTypesResponse(
								contentTypes,
								type === 'object' || type === 'array'
									? ({
											type,
											properties,
											patternProperties,
											items: value.items,
											required,
									  } as any)
									: value,
							),
						}
					}
				},
			)
		}
	} else if (typeof responseSchema === 'string') {
		if (!(responseSchema in models)) return

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const {
			type,
			properties,
			required,
			additionalProperties: _1,
			patternProperties: _2,
			...rest
		} = models[responseSchema] as TSchema & {
			type: string
			properties: Object
			required: string[]
		}

		responseSchema = {
			// @ts-ignore
			'200': {
				...rest,
				content: mapTypesResponse(contentTypes, responseSchema),
			},
		}
	}

	const parameters = [
		// ...mapProperties('header', headerSchema, models),
		...mapProperties('path', paramsSchema, models),
		...mapProperties('query', querySchema, models),
	]

	schema[path] = {
		...(schema[path] ? schema[path] : {}),
		[method.toLowerCase()]: {
			...((paramsSchema || querySchema || bodySchema
				? ({ parameters } as any)
				: {}) satisfies OpenAPIV3.ParameterObject),
			...(responseSchema
				? {
						responses: responseSchema,
				  }
				: {}),
			operationId:
				hook?.detail?.operationId ?? generateOperationId(method, path),
			...hook?.detail,
			...(bodySchema
				? {
						requestBody: {
							required: true,
							content: mapTypesResponse(
								contentTypes,
								typeof bodySchema === 'string'
									? {
											$ref: `#/components/schemas/${bodySchema}`,
									  }
									: (bodySchema as any),
							),
						},
				  }
				: null),
		} satisfies OpenAPIV3.OperationObject,
	}
}

/**
 * Plugin for [elysia](https://github.com/elysiajs/elysia) that auto-generate Swagger page.
 *
 * @see https://github.com/elysiajs/elysia-swagger
 */
export const openapi = <Path extends string = '/openapi'>({
	path,
	documentation = {},
}: {
	path: Path
	/**
	 * Customize Swagger config, refers to Swagger 2.0 config
	 *
	 * @see https://swagger.io/specification/v2/
	 */
	documentation?: Omit<
		Partial<OpenAPIV3.Document>,
		| 'x-express-openapi-additional-middleware'
		| 'x-express-openapi-validation-strict'
	>
}) => {
	const schema = {}
	let totalRoutes = 0

	const relativePath = path.startsWith('/') ? path.slice(1) : path

	const app = new Spiceflow({ name: 'openapi' }).get(path, ({}) => {
		let routes = app.getAllRoutes()
		if (routes.length !== totalRoutes) {
			const ALLOWED_METHODS = [
				'GET',
				'PUT',
				'POST',
				'DELETE',
				'OPTIONS',
				'HEAD',
				'PATCH',
				'TRACE',
			]
			totalRoutes = routes.length

			routes.forEach((route: InternalRoute) => {
				if (route.hooks?.detail?.hide === true) return
				// TODO: route.hooks?.detail?.hide !== false  add ability to hide: false to prevent excluding
				if (excludeMethods.includes(route.method)) return
				if (
					ALLOWED_METHODS.includes(route.method) === false &&
					route.method !== 'ALL'
				)
					return

				if (route.method === 'ALL') {
					ALLOWED_METHODS.forEach((method) => {
						registerSchemaPath({
							schema,
							hook: route.hooks,
							method,
							path: route.path,
							// @ts-ignore
							models: app.definitions?.type,
							contentType: route.hooks.type,
						})
					})
					return
				}

				registerSchemaPath({
					schema,
					hook: route.hooks,
					method: route.method,
					path: route.path,
					// @ts-ignore
					models: app.definitions?.type,
					contentType: route.hooks.type,
				})
			})
		}

		return {
			openapi: '3.0.3',
			...{
				...documentation,
				// tags: documentation.tags?.filter(
				// 	(tag) => !excludeTags?.includes(tag?.name),
				// ),
				info: {
					title: 'Elysia Documentation',
					description: 'Development documentation',
					version: '0.0.0',
					...documentation.info,
				},
			},
			paths: {
				...schema,
				...documentation.paths,
			},
			components: {
				...documentation.components,
				schemas: {
					// @ts-ignore
					...app.definitions?.type,
					...documentation.components?.schemas,
				},
			},
		} satisfies OpenAPIV3.Document
	})

	return app
}

function getJsonSchema(schema: TypeSchema): JSONSchemaType<any> {
	if (schema instanceof z.ZodType) {
		let jsonSchema = zodToJsonSchema(schema, {})
		return jsonSchema as any
	}

	return schema as any
}
