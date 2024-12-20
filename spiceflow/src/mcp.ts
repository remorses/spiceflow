import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { Spiceflow } from './spiceflow.js'
import { InternalRoute } from './types.js'
import { isZodSchema } from './spiceflow.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { SSEServerTransportSpiceflow } from './mcp-transport.js'

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
  const server = new Server({ name, version }, { capabilities: { tools: {} } })

  const transports = new Map<string, SSEServerTransportSpiceflow>()
  // Get all routes from the parent app
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
        console.log('got post')
        return await transport.handlePostMessage(request)
      }
      let routes = app
        .getAllRoutes()
        .filter((x) => x.path !== path && x.path !== messagePath)
      // console.log('routes', routes);

      server.setRequestHandler(ListToolsRequestSchema, async () => {
        console.log('list tools')
        return {
          tools: routes.map((route) => {
            const bodySchema = getJsonSchema(route.hooks?.body)
            const querySchema = getJsonSchema(route.hooks?.query)
            const paramsSchema = getJsonSchema(route.hooks?.params)

            // Combine all parameters into one schema
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
        console.log('showing schema')
        const toolName = request.params.name
        const { path, method } = getPathFromToolName(toolName)

        const route = routes.find(
          (r) => r.method.toLowerCase() === method && r.path === path,
        )

        if (!route) {
          return {
            content: [{ type: 'text', text: `Tool ${toolName} not found` }],
            isError: true,
          }
        }

        try {
          const { body, query, params } = request.params.arguments || {}

          const url = new URL(`http://localhost${path}`)
          if (query) {
            Object.entries(query).forEach(([key, value]) => {
              url.searchParams.set(key, String(value))
            })
          }

          const response = await app.handle(
            new Request(url, {
              method: route.method,
              headers: {
                'content-type': 'application/json',
              },
              body: body ? JSON.stringify(body) : undefined,
            }),
          )

          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const json = await response.json()
            return {
              content: [{ type: 'text', text: JSON.stringify(json, null, 2) }],
            }
          }

          const text = await response.text()
          return {
            content: [{ type: 'text', text }],
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: error.message || 'Unknown error' }],
            isError: true,
          }
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
