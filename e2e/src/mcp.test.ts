import { beforeAll, describe, expect, it } from 'vitest'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import {
  CallToolResultSchema,
  ListResourcesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { experimental_createMCPClient } from 'ai'
import { AnySpiceflow, Spiceflow } from 'spiceflow'
import { createMCPServer, mcp } from 'spiceflow/mcp'
import { z } from 'zod'

import { FetchMCPCLientTransport } from 'spiceflow/dist/mcp-client-transport'
import { getAvailablePort } from './get-available-port.ts'

describe('ai sdk mcp', () => {
  it('should work', async () => {
    const app = new Spiceflow({ basePath: '/api' })
      .use(mcp({ path: '/mcp' }))
      .get('/goSomething', () => 'hi')
      .get(
        '/somethingElse/:id',
        ({ params: { id } }) => {
          return 'hello ' + id
        },
        {
          params: z.object({ id: z.string() }),
        },
      )
      .post(
        '/somethingElse/:id',
        ({ params: { id } }) => {
          return {
            message: 'hello ' + id,
          }
        },
        {
          params: z.object({ id: z.string() }),
          body: z.any(),
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

    // Snapshot OpenAPI doc

    const transport = new FetchMCPCLientTransport({
      fetch: app.handle,
      url: 'http://localhost/api/mcp',
    })

    const client = new Client(
      {
        name: 'example-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    )

    await client.connect(transport)
    expect(await client.listTools()).toMatchInlineSnapshot(`
      {
        "tools": [
          {
            "description": "GET /api/goSomething",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET /api/goSomething",
          },
          {
            "description": "GET /api/somethingElse/{id}",
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
            "name": "GET /api/somethingElse/{id}",
          },
          {
            "description": "POST /api/somethingElse/{id}",
            "inputSchema": {
              "properties": {
                "body": {},
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
              "required": [
                "body",
              ],
              "type": "object",
            },
            "name": "POST /api/somethingElse/{id}",
          },
          {
            "description": "GET /api/search",
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
            "name": "GET /api/search",
          },
          {
            "description": "POST /api/mcp/message",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "POST /api/mcp/message",
          },
          {
            "description": "GET /api/mcp",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET /api/mcp",
          },
        ],
      }
    `)

    const customClient = await experimental_createMCPClient({
      transport: transport,

      onUncaughtError(error) {
        console.error(error)
        // throw error
      },
    })

    await customClient.init()

    const tools = await customClient.tools()

    expect(tools).toMatchInlineSnapshot(`
      {
        "GET /api/goSomething": {
          "description": "GET /api/goSomething",
          "execute": [Function],
          "parameters": {
            "_type": undefined,
            "jsonSchema": {
              "additionalProperties": false,
              "properties": {},
              "type": "object",
            },
            "validate": undefined,
            Symbol(vercel.ai.schema): true,
            Symbol(vercel.ai.validator): true,
          },
        },
        "GET /api/mcp": {
          "description": "GET /api/mcp",
          "execute": [Function],
          "parameters": {
            "_type": undefined,
            "jsonSchema": {
              "additionalProperties": false,
              "properties": {},
              "type": "object",
            },
            "validate": undefined,
            Symbol(vercel.ai.schema): true,
            Symbol(vercel.ai.validator): true,
          },
        },
        "GET /api/search": {
          "description": "GET /api/search",
          "execute": [Function],
          "parameters": {
            "_type": undefined,
            "jsonSchema": {
              "additionalProperties": false,
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
            "validate": undefined,
            Symbol(vercel.ai.schema): true,
            Symbol(vercel.ai.validator): true,
          },
        },
        "GET /api/somethingElse/{id}": {
          "description": "GET /api/somethingElse/{id}",
          "execute": [Function],
          "parameters": {
            "_type": undefined,
            "jsonSchema": {
              "additionalProperties": false,
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
            "validate": undefined,
            Symbol(vercel.ai.schema): true,
            Symbol(vercel.ai.validator): true,
          },
        },
        "POST /api/mcp/message": {
          "description": "POST /api/mcp/message",
          "execute": [Function],
          "parameters": {
            "_type": undefined,
            "jsonSchema": {
              "additionalProperties": false,
              "properties": {},
              "type": "object",
            },
            "validate": undefined,
            Symbol(vercel.ai.schema): true,
            Symbol(vercel.ai.validator): true,
          },
        },
        "POST /api/somethingElse/{id}": {
          "description": "POST /api/somethingElse/{id}",
          "execute": [Function],
          "parameters": {
            "_type": undefined,
            "jsonSchema": {
              "additionalProperties": false,
              "properties": {
                "body": {},
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
              "required": [
                "body",
              ],
              "type": "object",
            },
            "validate": undefined,
            Symbol(vercel.ai.schema): true,
            Symbol(vercel.ai.validator): true,
          },
        },
      }
    `)
  })
})

describe('MCP Plugin', () => {
  let app: AnySpiceflow
  let port: number
  let client: Client

  beforeAll(async () => {
    port = await getAvailablePort()

    app = new Spiceflow({ basePath: '/api' })
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
    await app.listenForNode(port)

    let transport = new FetchMCPCLientTransport({
      url: new URL(`http://localhost:${port}/api/mcp`).toString(),
      fetch: app.handle,
    })

    client = new Client(
      {
        name: 'example-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
        enforceStrictCapabilities: true,
      },
    )

    await client.connect(transport)
  })

  it('should list and call available tools', async () => {
    const tools = await client.request(
      { method: 'tools/list' },
      ListToolsResultSchema,
    )

    expect(tools).toBeDefined()
    expect(tools).toHaveProperty('tools')
    expect(tools).toMatchInlineSnapshot(`
      {
        "tools": [
          {
            "description": "GET /api/goSomething",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET /api/goSomething",
          },
          {
            "description": "GET /api/users",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET /api/users",
          },
          {
            "description": "GET /api/somethingElse/{id}",
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
            "name": "GET /api/somethingElse/{id}",
          },
          {
            "description": "GET /api/search",
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
            "name": "GET /api/search",
          },
          {
            "description": "POST /api/mcp/message",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "POST /api/mcp/message",
          },
          {
            "description": "GET /api/mcp",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET /api/mcp",
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
          "name": "GET /api/goSomething",
          "uri": "http://localhost/api/goSomething",
        },
        {
          "mimeType": "application/json",
          "name": "GET /api/users",
          "uri": "http://localhost/api/users",
        },
        {
          "mimeType": "application/json",
          "name": "GET /api/_mcp_config",
          "uri": "http://localhost/api/_mcp_config",
        },
        {
          "mimeType": "application/json",
          "name": "GET /api/_mcp_openapi",
          "uri": "http://localhost/api/_mcp_openapi",
        },
      ]
    `)

    const resourceContent = await client.request(
      {
        method: 'resources/read',
        params: {
          uri: `http://localhost:${port}/api/users`,
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
          "uri": "http://localhost:4000/api/users",
        },
      ]
    `)
  })
})
