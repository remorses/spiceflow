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

function getJsonSchema(schema: any) {
  if (!schema) return undefined
  if (isZodSchema(schema)) {
    return zodToJsonSchema(schema, {})
  }
  return schema
}

export const mcp = <Path extends string = '/mcp'>({
  path = '/mcp' as Path,
  name = 'spiceflow',
  version = '1.0.0',
} = {}) => {
  const server = new Server(
    { name, version },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  )

  const transports = new Map<string, SSEServerTransportSpiceflow>()
  const messagePath = path + '/message'
  let app = new Spiceflow({ name: 'mcp' })
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
      let routes = app
        .getAllRoutes()
        .filter((x) => x.path !== path && x.path !== messagePath)

      server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
          tools: routes.map((route) => {
            const bodySchema = getJsonSchema(route.hooks?.body)
            const querySchema = getJsonSchema(route.hooks?.query)
            const paramsSchema = getJsonSchema(route.hooks?.params)

            const properties: Record<string, any> = {}
            const required: string[] = []

            if (bodySchema) {
              properties.body = bodySchema
              required.push('body')
            }
            if (querySchema?.properties) {
              properties.query = querySchema
            }
            if (paramsSchema?.properties) {
              properties.params = paramsSchema
            }

            return {
              name: getRouteName({ method: route.method, path: route.path }),

              description:
                route.hooks?.detail?.description ||
                `${route.method} ${route.path}`,
              inputSchema: {
                type: 'object',
                properties,
                required,
              },
            }
          }),
        }
      })

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const toolName = request.params.name
        let { path, method } = getPathFromToolName(toolName)

        const route = routes.find(
          (r) =>
            r.method.toUpperCase() === method.toUpperCase() && r.path === path,
        )

        if (!route) {
          return {
            content: [{ type: 'text', text: `Tool ${toolName} not found` }],
            isError: true,
          }
        }

        try {
          const { body, query, params } = request.params.arguments || {}

          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              path = path.replace(`:${key}`, encodeURIComponent(String(value)))
            })
          }
          const url = new URL(`http://localhost${path}`)
          if (query) {
            Object.entries(query).forEach(([key, value]) => {
              url.searchParams.set(key, String(value))
            })
          }

          const response = await app.topLevelApp!.handle(
            new Request(url, {
              method: route.method,
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
      const resourcesRoutes = routes.filter((route) => {
        if (route.method !== 'GET') return false

        if (route.path.includes(':')) return false

        const querySchema = route.hooks?.query

        if (querySchema) {
          const jsonSchema = getJsonSchema(querySchema)
          if (jsonSchema?.required?.length) {
            return false
          }
        }

        return true
      })
      server.setRequestHandler(ListResourcesRequestSchema, async () => {
        const resources = resourcesRoutes.map((route) => ({
          uri: new URL(route.path, `http://${request.headers.get('host')}`)
            .href,
          mimeType: 'application/json',
          name: `GET ${route.path}`,
        }))
        return { resources }
      })

      server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const resourceUrl = new URL(request.params.uri)
        const path = resourceUrl.pathname

        const route = resourcesRoutes.find(
          (route) => route.path === path && route.method === 'GET',
        )
        if (!route) {
          throw new Error('Resource not found')
        }

        const response = await app.topLevelApp!.handle(
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
