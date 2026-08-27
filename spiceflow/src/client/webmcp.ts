// Registers Spiceflow API routes as browser WebMCP tools from OpenAPI metadata.
import type { SpiceflowFetch } from './fetch.ts'
import { SpiceflowFetchError } from './errors.ts'
import type { OpenAPIV3 } from '../openapi-types.ts'

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

export type WebMcpRouteFilter = {
  path: string
  method?: string
}

export type InstallWebMcpOptions = {
  fetch: SpiceflowFetch<any>
  openapiPath?: string
  include?: WebMcpRouteFilter[]
  exclude?: WebMcpRouteFilter[]
}

export type WebMcpTool = {
  name: string
  title?: string
  description: string
  inputSchema: JsonObject
  annotations?: {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
  }
  execute: (
    input: JsonObject,
    options: { signal: AbortSignal },
  ) => Promise<any>
}

type WebMcpModelContext = {
  getTools: () => Promise<Array<{ name: string; window: Window }>>
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal },
  ) => Promise<void>
}

const httpMethods: Array<
  'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace'
> = [
  'get',
  'delete',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
]

export async function installWebMcp({
  fetch,
  openapiPath = '/openapi',
  include,
  exclude,
}: InstallWebMcpOptions): Promise<() => void> {
  const noop = () => {}
  if (typeof document === 'undefined') return noop

  const modelContext = Reflect.get(document, 'modelContext') as
    | WebMcpModelContext
    | undefined
  if (!modelContext?.registerTool || !modelContext.getTools) return noop

  try {
    const openapi = await callFetch({ fetch, path: openapiPath })
    if (openapi instanceof Error) {
      console.error('[spiceflow] Could not load WebMCP tools', openapi)
      return noop
    }
    if (!openapi || typeof openapi !== 'object' || !openapi.paths) {
      console.error('[spiceflow] OpenAPI response does not contain paths')
      return noop
    }

    const tools = createWebMcpTools({ fetch, openapi, include, exclude })
    if (tools instanceof Error) {
      console.error('[spiceflow] Could not create WebMCP tools', tools)
      return noop
    }

    const registeredTools = await modelContext.getTools()

    const ownWindow = document.defaultView
    const existingNames = new Set(
      registeredTools
        .filter((tool) => tool.window === ownWindow)
        .map((tool) => tool.name),
    )
    const controller = new AbortController()

    try {
      for (const tool of tools) {
        if (existingNames.has(tool.name)) continue
        await modelContext.registerTool(tool, { signal: controller.signal })
      }
    } catch (cause) {
      controller.abort()
      throw cause
    }

    return () => controller.abort()
  } catch (cause) {
    console.error('[spiceflow] Could not install WebMCP tools', cause)
    return noop
  }
}

export function createWebMcpTools({
  fetch,
  openapi,
  include,
  exclude,
}: {
  fetch: SpiceflowFetch<any>
  openapi: OpenAPIV3.Document
  include?: WebMcpRouteFilter[]
  exclude?: WebMcpRouteFilter[]
}): Error | WebMcpTool[] {
  const tools: WebMcpTool[] = []
  const names = new Set<string>()

  for (const [openapiPath, pathItem] of Object.entries(openapi.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue

    for (const method of httpMethods) {
      const operation = pathItem[method]
      if (!operation || isReferenceObject(operation)) continue
      if (operation['x-fern-streaming']) continue

      const path = toSpiceflowPath(openapiPath)
      const route = { method: method.toUpperCase(), path }
      const inputSchema = createInputSchema({
        openapi,
        method: route.method,
        operation,
        pathParameters: pathItem.parameters,
      })
      const hasInput = Object.keys(inputSchema.properties).length > 0

      if (include !== undefined) {
        if (!include.some((filter) => matchesFilter(route, filter))) continue
      } else if (!hasInput) {
        continue
      }
      if (exclude?.some((filter) => matchesFilter(route, filter))) continue

      const name = createToolName(operation.operationId, route)
      if (name instanceof Error) return name
      if (names.has(name)) {
        return new Error(
          `WebMCP tool name '${name}' is not unique. Set distinct OpenAPI operationId values.`,
        )
      }
      names.add(name)

      const description =
        operation.description ||
        operation.summary ||
        `${route.method} route for ${route.path}`
      const title = operation.summary || undefined

      const tool: WebMcpTool = {
        name,
        description,
        inputSchema,
        execute: async (input, { signal }) => {
          try {
            const result = await callFetch({
              fetch,
              path: route.path,
              options: {
                method: route.method,
                params: input.params,
                query: input.query,
                body: input.body,
                signal,
              },
            })

            if (result instanceof SpiceflowFetchError) {
              return {
                ok: false,
                error: {
                  message: result.message,
                  status: result.status,
                  value: result.value,
                },
              }
            }
            if (result instanceof Error) {
              return { ok: false, error: { message: result.message } }
            }
            if (result && typeof result[Symbol.asyncIterator] === 'function') {
              return {
                ok: false,
                error: { message: 'Streaming routes are not supported by WebMCP' },
              }
            }
            return result === undefined ? null : result
          } catch (cause) {
            if (signal.aborted) throw signal.reason
            const message = cause instanceof Error ? cause.message : String(cause)
            return { ok: false, error: { message } }
          }
        },
      }
      if (title) tool.title = title
      if (route.method === 'GET' || route.method === 'HEAD') {
        tool.annotations = { readOnlyHint: true }
      }
      tools.push(tool)
    }
  }

  return tools
}

function createInputSchema({
  openapi,
  method,
  operation,
  pathParameters,
}: {
  openapi: OpenAPIV3.Document
  method: string
  operation: OpenAPIV3.OperationObject
  pathParameters?: Array<
    OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
  >
}) {
  const properties: JsonObject = {}
  const required: string[] = []
  const allParameters = [
    ...(Array.isArray(pathParameters) ? pathParameters : []),
    ...(Array.isArray(operation.parameters) ? operation.parameters : []),
  ]
  const parameterMap = new Map<string, OpenAPIV3.ParameterObject>()
  for (const parameter of allParameters) {
    if (isReferenceObject(parameter)) continue
    parameterMap.set(`${parameter.in}:${parameter.name}`, parameter)
  }
  const parameters = [...parameterMap.values()]

  for (const location of ['path', 'query'] as const) {
    const matching = parameters.filter(
      (parameter) =>
        parameter &&
        typeof parameter === 'object' &&
        !isReferenceObject(parameter) &&
        parameter.in === location &&
        parameter.schema,
    )
    if (!matching.length) continue

    const parameterProperties: JsonObject = {}
    const parameterRequired: string[] = []
    for (const parameter of matching) {
      const schema = rewriteSchemaRefs(parameter.schema)
      if (parameter.description && !schema.description) {
        schema.description = parameter.description
      }
      parameterProperties[parameter.name] = schema
      if (parameter.required || location === 'path') {
        parameterRequired.push(parameter.name)
      }
    }

    const key = location === 'path' ? 'params' : 'query'
    const parameterSchema: {
      type: string
      properties: JsonObject
      required?: string[]
    } = {
      type: 'object',
      properties: parameterProperties,
    }
    if (parameterRequired.length) {
      parameterSchema.required = parameterRequired
    }
    properties[key] = parameterSchema
    if (parameterRequired.length) required.push(key)
  }

  const requestBody = operation.requestBody
  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    requestBody &&
    !isReferenceObject(requestBody)
  ) {
    const content = requestBody.content
    const mediaType =
      content?.['application/json'] ||
      Object.entries(content || {}).find(([type]) => type.endsWith('+json'))?.[1]
    if (mediaType?.schema) {
      properties.body = rewriteSchemaRefs(mediaType.schema)
      if (requestBody.required === true) required.push('body')
    }
  }

  const inputSchema: {
    type: string
    properties: JsonObject
    required?: string[]
    $defs?: JsonValue
  } = {
    type: 'object',
    properties,
  }
  if (required.length) inputSchema.required = required
  if (hasComponentReference(inputSchema) && openapi.components?.schemas) {
    inputSchema.$defs = rewriteSchemaRefs(openapi.components.schemas)
  }
  return inputSchema
}

function rewriteSchemaRefs(value: any): any {
  if (Array.isArray(value)) return value.map(rewriteSchemaRefs)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (key === '$ref' && typeof child === 'string') {
        return [key, child.replace('#/components/schemas/', '#/$defs/')]
      }
      return [key, rewriteSchemaRefs(child)]
    }),
  )
}

function hasComponentReference(value: any): boolean {
  if (Array.isArray(value)) return value.some(hasComponentReference)
  if (!value || typeof value !== 'object') return false
  if (
    typeof value.$ref === 'string' &&
    value.$ref.startsWith('#/$defs/')
  ) {
    return true
  }
  return Object.values(value).some(hasComponentReference)
}

function matchesFilter(
  route: { method: string; path: string },
  filter: WebMcpRouteFilter,
) {
  if (toSpiceflowPath(filter.path) !== route.path) return false
  return !filter.method || filter.method.toUpperCase() === route.method
}

function toSpiceflowPath(path: string) {
  return path.replace(/\{([^}]+)\}/g, ':$1')
}

function createToolName(
  operationId: string | undefined,
  route: { method: string; path: string },
): string | Error {
  const source =
    typeof operationId === 'string' && operationId
      ? operationId
      : `${route.method.toLowerCase()}_${route.path}`
  const name = source
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!name || name.length > 128) {
    return new Error(
      `Cannot create a valid WebMCP tool name for ${route.method} ${route.path}. Set a shorter OpenAPI operationId.`,
    )
  }
  return name
}

function callFetch({
  fetch,
  path,
  options,
}: {
  fetch: SpiceflowFetch<any>
  path: string
  options?: {
    method: string
    params?: JsonValue
    query?: JsonValue
    body?: JsonValue
    signal: AbortSignal
  }
}) {
  return Reflect.apply(fetch, undefined, options ? [path, options] : [path])
}

function isReferenceObject(value: any): value is OpenAPIV3.ReferenceObject {
  return typeof Reflect.get(value, '$ref') === 'string'
}
