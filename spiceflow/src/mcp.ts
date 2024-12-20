import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { Spiceflow } from './spiceflow.js'
import { InternalRoute } from './types.js'
import { isZodSchema } from './spiceflow.js'
import { zodToJsonSchema } from 'zod-to-json-schema'

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
  const app = new Spiceflow({ name: 'mcp' })

  app.get(path, async ({ request }) => {
    const server = new Server(
      { name, version },
      { capabilities: { tools: {} } },
    )

    // Get all routes from the parent app
    let routes = app.getAllRoutes()

    server.setRequestHandler(ListToolsRequestSchema, async () => {
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
            name: `${route.method.toLowerCase()}_${route.path.replace(
              /\//g,
              '_',
            )}`,
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
      const [method, ...pathParts] = toolName.split('_')
      const path = '/' + pathParts.join('/')

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

    // Handle the MCP request
    const transport = {
      async send(message: any) {
        return new Response(JSON.stringify(message), {
          headers: {
            'content-type': 'application/json',
          },
        })
      },
      async receive() {
        return await request.json()
      },
    }

    return await server.connect(transport)
  })

  return app
}
