import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { EventSource } from 'eventsource'

import { mcp } from './mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'

import {
  ListResourcesResultSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { z } from 'zod'
import { Spiceflow } from './spiceflow.js'
describe('MCP Plugin', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).EventSource = EventSource

  let app: Spiceflow
  let port: number
  let client: Client
  let transport: SSEClientTransport

  beforeAll(async () => {
    port = await getAvailablePort()

    app = new Spiceflow()
      .use(mcp({ path: '/mcp' }))
      .get('/goSomething', () => 'hi')
      .get('/users', () => ({ users: [{ id: 1, name: 'John' }] }))
      .get(
        '/somethingElse/:id',
        ({ params: { id } }) => {
          return 'hello ' + id
        },
        {
          params: z.object({ id: z.string() }),
        },
      )
      .get(
        '/search',
        ({ query }) => {
          return { results: [`Found results for: ${query.q}`] }
        },
        {
          query: z
            .object({
              q: z.string().describe('Search query'),
              limit: z.number().optional().describe('Max number of results'),
            })
            .required(),
        },
      )
    await app.listen(port)

    transport = new SSEClientTransport(new URL(`http://localhost:${port}/mcp`))

    client = new Client(
      {
        name: 'example-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    )

    await client.connect(transport)
  })

  it('should list and call available tools', async () => {
    const resources = await client.request(
      { method: 'tools/list' },
      ListToolsResultSchema,
    )

    expect(resources).toBeDefined()
    expect(resources).toHaveProperty('tools')
    expect(resources).toMatchInlineSnapshot(`
      {
        "tools": [
          {
            "description": "GET /goSomething",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET /goSomething",
          },
          {
            "description": "GET /users",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET /users",
          },
          {
            "description": "GET /somethingElse/{id}",
            "inputSchema": {
              "properties": {
                "params": {
                  "properties": {
                    "id": {
                      "type": "string",
                    },
                  },
                  "required": [
                    "id",
                  ],
                  "type": "object",
                },
              },
              "type": "object",
            },
            "name": "GET /somethingElse/{id}",
          },
          {
            "description": "GET /search",
            "inputSchema": {
              "properties": {
                "query": {
                  "properties": {
                    "limit": {
                      "type": "number",
                    },
                    "q": {
                      "type": "string",
                    },
                  },
                  "required": [
                    "q",
                    "limit",
                  ],
                  "type": "object",
                },
              },
              "type": "object",
            },
            "name": "GET /search",
          },
        ],
      }
    `)

    const resourceContent = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'POST /somethingElse/:id',
          arguments: {
            params: { id: 'xxx' },
          },
        },
      },
      CallToolResultSchema,
    )

    expect(resourceContent).toBeDefined()
    expect(resourceContent).toHaveProperty('content')
    expect(resourceContent).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Tool POST /somethingElse/:id not found",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `)
  })

  it('should list and read available resources', async () => {
    const resources = await client.request(
      { method: 'resources/list' },
      ListResourcesResultSchema,
    )

    expect(resources).toBeDefined()

    expect(resources.resources).toMatchInlineSnapshot(`
      [
        {
          "mimeType": "application/json",
          "name": "GET /goSomething",
          "uri": "http://localhost/goSomething",
        },
        {
          "mimeType": "application/json",
          "name": "GET /users",
          "uri": "http://localhost/users",
        },
      ]
    `)

    const resourceContent = await client.request(
      {
        method: 'resources/read',
        params: {
          uri: `http://localhost:${port}/users`,
        },
      },
      ReadResourceResultSchema,
    )

    expect(resourceContent).toBeDefined()
    expect(resourceContent.contents).toMatchInlineSnapshot(`
      [
        {
          "mimeType": "application/json",
          "text": "{"users":[{"id":1,"name":"John"}]}",
          "uri": "http://localhost:4000/users",
        },
      ]
    `)
  })
})

async function getAvailablePort(startPort = 4000, maxRetries = 10) {
  const net = await import('net')

  return await new Promise<number>((resolve, reject) => {
    let port = startPort
    let attempts = 0

    const checkPort = () => {
      const server = net.createServer()

      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          attempts++
          if (attempts >= maxRetries) {
            reject(new Error('No available ports found'))
          } else {
            port++
            checkPort()
          }
        } else {
          reject(err)
        }
      })

      server.once('listening', () => {
        server.close(() => {
          resolve(port)
        })
      })

      server.listen(port)
    }

    checkPort()
  })
}
