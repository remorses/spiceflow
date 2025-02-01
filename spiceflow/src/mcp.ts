import { Server } from '@modelcontextprotocol/sdk/server/index.js'

import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { SSEServerTransportSpiceflow } from './mcp-transport.js'
import { isZodSchema, Spiceflow } from './spiceflow.js'
import { OpenAPIV3 } from 'openapi-types'
import { openapi } from './openapi.js'

function getJsonSchema(schema: any) {
  if (!schema) return undefined
  if (isZodSchema(schema)) {
    return zodToJsonSchema(schema, {
      removeAdditionalStrategy: 'strict',
    })
  }
  return schema
}
const transports = new Map<string, SSEServerTransportSpiceflow>()
function getOperationRequestBody(
  operation: OpenAPIV3.OperationObject,
): OpenAPIV3.SchemaObject | undefined {
  if (!operation.requestBody) return undefined

  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject
  const content = requestBody.content['application/json']
  return content?.schema as OpenAPIV3.SchemaObject
}

function getOperationParameters(operation: OpenAPIV3.OperationObject): {
  queryParams?: OpenAPIV3.SchemaObject
  pathParams?: OpenAPIV3.SchemaObject
} {
  if (!operation.parameters) return {}

  const queryProperties: Record<string, OpenAPIV3.SchemaObject> = {}
  const pathProperties: Record<string, OpenAPIV3.SchemaObject> = {}
  const queryRequired: string[] = []
  const pathRequired: string[] = []

  operation.parameters.forEach((param) => {
    if ('$ref' in param) return // TODO referenced parameters
    
    if (param.in === 'query') {
      queryProperties[param.name] = param.schema as OpenAPIV3.SchemaObject
      if (param.required) queryRequired.push(param.name)
    } else if (param.in === 'path') {
      pathProperties[param.name] = param.schema as OpenAPIV3.SchemaObject
      if (param.required) pathRequired.push(param.name)
    }
  })

  const result: {
    queryParams?: OpenAPIV3.SchemaObject
    pathParams?: OpenAPIV3.SchemaObject
  } = {}

  if (Object.keys(queryProperties).length > 0) {
    result.queryParams = {
      type: 'object',
      properties: queryProperties,
      required: queryRequired.length > 0 ? queryRequired : undefined,
    }
  }

  if (Object.keys(pathProperties).length > 0) {
    result.pathParams = {
      type: 'object',
      properties: pathProperties,
      required: pathRequired.length > 0 ? pathRequired : undefined,
    }
  }

  return result
}

function createMCPServer({
  name = 'spiceflow',
  version = '1.0.0',
  openapi,
  app,
}: {
  name?: string
  version?: string
  openapi: OpenAPIV3.Document
  app: Spiceflow
}) {
  const server = new Server(
    { name, version },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Object.entries(openapi.paths)
      .filter(
        ([path]) => !['/mcp-openapi', '/mcp', '/mcp/message'].includes(path),
      )
      .flatMap(([path, pathObj]) =>
        Object.entries(pathObj || {})
          .filter(([method]) => method !== 'parameters')
          .map(([method, operation]) => {
            const properties: Record<string, any> = {}
            const required: string[] = []

            const requestBody = getOperationRequestBody(
              operation as OpenAPIV3.OperationObject,
            )
            if (requestBody) {
              properties.body = requestBody
              required.push('body')
            }

            const { queryParams, pathParams } = getOperationParameters(
              operation as OpenAPIV3.OperationObject,
            )
            if (queryParams) {
              properties.query = queryParams
            }
            if (pathParams) {
              properties.params = pathParams
            }

            return {
              name: getRouteName({ method, path }),
              description:
                (operation as OpenAPIV3.OperationObject).description ||
                (operation as OpenAPIV3.OperationObject).summary ||
                `${method.toUpperCase()} ${path}`,
              inputSchema: {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined,
              },
            }
          }),
      )

    return { tools }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name
    let { path, method } = getPathFromToolName(toolName)

    const pathObj = openapi.paths[path]
    if (!pathObj || !pathObj[method.toLowerCase()]) {
      return {
        content: [{ type: 'text', text: `Tool ${toolName} not found` }],
        isError: true,
      }
    }

    try {
      const { body, query, params } = request.params.arguments || {}

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
        })
      }

      const url = new URL(`http://localhost${path}`)
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          url.searchParams.set(key, String(value))
        })
      }

      const response = await app.handle(
        new Request(url, {
          method: method,
          headers: {
            'content-type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        }),
      )

      const isError = !response.ok
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        const json = await response.json()
        return {
          isError,
          content: [{ type: 'text', text: JSON.stringify(json, null, 2) }],
        }
      }

      const text = await response.text()
      return {
        isError,
        content: [{ type: 'text', text }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: error.message || 'Unknown error' }],
        isError: true,
      }
    }
  })

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources: { uri: string; mimeType: string; name: string }[] = []
    for (const [path, pathObj] of Object.entries(openapi.paths)) {
      if (path.startsWith('/mcp')) {
        continue
      }
      const getOperation = pathObj?.get as OpenAPIV3.OperationObject
      if (getOperation && !path.includes('{')) {
        const { queryParams } = getOperationParameters(getOperation)
        const hasRequiredQuery =
          queryParams?.required && queryParams.required.length > 0

        if (!hasRequiredQuery) {
          resources.push({
            uri: new URL(path, 'http://localhost').href,
            mimeType: 'application/json',
            name: `GET ${path}`,
          })
        }
      }
    }
    return { resources }
  })

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resourceUrl = new URL(request.params.uri)
    const path = resourceUrl.pathname

    const pathObj = openapi.paths[path]
    if (!pathObj?.get) {
      throw new Error('Resource not found')
    }

    const response = await app.handle(
      new Request(resourceUrl, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const contentType = response.headers.get('content-type')
    const text = await response.text()

    if (contentType?.includes('application/json')) {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'application/json',
            text: text,
          },
        ],
      }
    }

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'text/plain',
          text,
        },
      ],
    }
  })

  return { server, transports }
}

export const mcp = <Path extends string = '/mcp'>({
  path = '/mcp' as Path,
  name = 'spiceflow',
  version = '1.0.0',
} = {}) => {
  const messagePath = path + '/message'

  let app = new Spiceflow({ name: 'mcp' })
    .use(openapi({ path: '/mcp-openapi' }))
    .post(messagePath, async ({ request, query }) => {
      const sessionId = query.sessionId!

      const t = transports.get(sessionId)
      if (!t) {
        return new Response('Session not found', { status: 404 })
      }

      await t.handlePostMessage(request)
      return 'ok'
    })
    .get(path, async ({ request }) => {
      const transport = new SSEServerTransportSpiceflow(messagePath)
      transports.set(transport.sessionId, transport)
      const openapi = await app
        .topLevelApp!.handle(new Request('http://localhost/mcp-openapi'))
        .then((r) => r.json())
      const { server } = createMCPServer({
        name,
        version,
        openapi,
        app: app!.topLevelApp!,
      })
      server.onclose = () => {
        transports.delete(transport.sessionId)
      }
      await server.connect(transport)

      request.signal.addEventListener('abort', () => {
        transport.close().catch((error) => {
          console.error('Error closing transport:', error)
        })
      })

      if (request.method === 'POST') {
        return await transport.handlePostMessage(request)
      }

      return transport.response
    })

  return app
}

function getRouteName({
  method,
  path,
}: {
  method: string
  path: string
}): string {
  return `${method.toUpperCase()} ${path}`
}

function getPathFromToolName(toolName: string): {
  path: string
  method: string
} {
  const parts = toolName.split(' ')
  if (parts.length < 2) {
    throw new Error('Invalid tool name format')
  }
  const method = parts[0].toUpperCase()
  const path = parts.slice(1).join(' ')
  return { path, method }
}
