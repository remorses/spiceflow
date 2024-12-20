import { JSONSchemaType } from 'ajv'
import { InternalRoute, isZodSchema, Spiceflow } from './spiceflow.js'
import { ZodType } from 'zod'

import type { OpenAPIV3 } from 'openapi-types'

let excludeMethods = ['OPTIONS']

import type { HTTPMethod, LocalHook, TypeSchema } from './types.js'

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
  schema?:
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
  route,
  models,
}: {
  schema: Partial<OpenAPIV3.PathsObject>
  route: InternalRoute
  models: Record<string, TypeSchema>
}) => {
  const hook = route.hooks ? deepClone(route.hooks) : undefined

  let contentTypes = ['application/json']

  if (isAsyncGenerator(route.handler) && !route.hooks?.response) {
    contentTypes = ['text/event-stream']
  } else if (hook?.type) {
    contentTypes = Array.isArray(hook.type) ? hook.type : [hook.type]
  }

  const path = toOpenAPIPath(route.path)

  const bodySchema = getJsonSchema(hook?.body)
  const paramsSchema = hook?.params
  // const headerSchema = hook?.headers
  const querySchema = hook?.query
  let responseSchema = hook?.response as unknown as TypeSchema
  let openapiResponse: OpenAPIV3.ResponsesObject = {}

  if (typeof responseSchema === 'object') {
    const isStatusMap = Object.keys(responseSchema).every(
      (key) => typeof key === 'number' || Number.isInteger(Number(key)),
    )
    if (!isStatusMap) {
      let jsonSchema = getJsonSchema(responseSchema)
      const {
        type,
        properties,
        required,
        additionalProperties,
        patternProperties,
        ...rest
      } = jsonSchema

      openapiResponse = {
        '200': {
          ...rest,
          description: (rest.description as any) || '',
          content: mapTypesResponse(
            contentTypes,
            type === 'object' || type === 'array'
              ? ({
                  type,
                  properties,
                  patternProperties,
                  items: jsonSchema.items,
                  required,
                } as any)
              : jsonSchema,
          ),
        },
      }
    } else {
      Object.entries(responseSchema as Record<string, TypeSchema>).forEach(
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
            } = getJsonSchema(models[value])

            openapiResponse[key] = {
              ...rest,
              description: rest.description as any,
              content: mapTypesResponse(contentTypes, value),
            }
          } else {
            const schema = getJsonSchema(value)
            const {
              type,
              properties,
              required,
              additionalProperties,
              patternProperties,
              ...rest
            } = schema

            openapiResponse[key] = {
              ...rest,
              description: (rest.description as any) || '',
              content: mapTypesResponse(
                contentTypes,
                type === 'object' || type === 'array'
                  ? ({
                      type,
                      properties,
                      patternProperties,
                      items: rest.items,
                      required,
                    } as any)
                  : schema,
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
    } = getJsonSchema(models[responseSchema])

    openapiResponse = {
      // @ts-ignore
      '200': {
        description: '',
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
    // Merge with existing path schema if it exists
    ...(schema[path] ?? {}),
    [route.method.toLowerCase()]: {
      // Add streaming flag for async generators
      ...(isAsyncGenerator(route.handler) && {
        'x-fern-streaming': {
          format: 'sse',
        },
      }),

      // Add parameters if any schemas are defined
      ...(paramsSchema || querySchema || bodySchema
        ? {
            parameters,
          }
        : {}),

      // Add responses if defined
      ...(!isObjEmpty(openapiResponse) && {
        responses: openapiResponse,
      }),

      // Set operation ID from hook detail or generate one
      operationId:
        hook?.detail?.operationId ?? generateOperationId(route.method, path),

      // Add any additional details from hook
      ...hook?.detail,

      // Add request body if body schema exists
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
  path = '/openapi' as Path,
  documentation = {},
}: {
  path?: Path
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
} = {}) => {
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
              route: { ...route, method },
              // @ts-ignore
              models: app.definitions?.type,
            })
          })
          return
        }

        registerSchemaPath({
          schema,
          route,
          // @ts-ignore
          models: app.definitions?.type,
        })
      })
    }

    return {
      openapi: '3.1.3',
      ...{
        ...documentation,
        // tags: documentation.tags?.filter(
        // 	(tag) => !excludeTags?.includes(tag?.name),
        // ),
        info: {
          title: 'Spiceflow Documentation',
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
  if (!schema) return undefined as any
  if (isZodSchema(schema)) {
    let fn = zodToJsonSchema.default ?? zodToJsonSchema
    let jsonSchema = fn(schema, {})
    return jsonSchema as any
  }

  return schema as any
}

function isObjEmpty(obj: Record<string, any>) {
  return obj === undefined || Object.keys(obj).length === 0
}

function isAsyncGenerator(fn: any): boolean {
  return (
    fn &&
    typeof fn === 'function' &&
    fn.constructor?.name === 'AsyncGeneratorFunction'
  )
}
