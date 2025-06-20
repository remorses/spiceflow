import { beforeAll, describe, expect, it } from 'vitest'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  CallToolResultSchema,
  ListResourcesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { experimental_createMCPClient } from 'ai'
import { AnySpiceflow, Spiceflow } from 'spiceflow'
import { mcp } from 'spiceflow/mcp'
import { z } from 'zod'

import { FetchMCPCLientTransport } from 'spiceflow/dist/mcp-client-transport'
import { getAvailablePort } from './get-available-port.ts'

describe('ai sdk mcp', () => {
  it('should work', async () => {
    const app = new Spiceflow({})
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
      url: 'http://localhost/mcp',
    })

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
        "GET_goSomething": {
          "description": "GET route for /goSomething",
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
        "GET_search": {
          "description": "GET route for /search",
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
        "GET_somethingElse_id": {
          "description": "GET route for /somethingElse/{id}",
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
        "POST_somethingElse_id": {
          "description": "POST route for /somethingElse/{id}",
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
      url: 'http://localhost/api/mcp',
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
            "description": "GET route for /api/goSomething",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET_api_goSomething",
          },
          {
            "description": "GET route for /api/users",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET_api_users",
          },
          {
            "description": "GET route for /api/somethingElse/{id}",
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
            "name": "GET_api_somethingElse_id",
          },
          {
            "description": "GET route for /api/search",
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
            "name": "GET_api_search",
          },
          {
            "description": "GET route for /api/_mcp_config",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET_api_mcp_config",
          },
          {
            "description": "POST route for /api/mcp/message",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "POST_api_mcp_message",
          },
          {
            "description": "GET route for /api/mcp",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET_api_mcp",
          },
          {
            "description": "GET route for /api/_mcp_openapi",
            "inputSchema": {
              "properties": {},
              "type": "object",
            },
            "name": "GET_api_mcp_openapi",
          },
        ],
      }
    `)

    const toolCallResult = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'GET_api_users',
          arguments: {},
        },
      },
      CallToolResultSchema,
    )

    expect(toolCallResult).toBeDefined()
    expect(toolCallResult).toHaveProperty('content')
    expect(toolCallResult).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Invalid URL",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `)
  })

  it('should call tools with parameters', async () => {
    const toolCallResult = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'GET_api_somethingElse_id',
          arguments: {
            params: { id: 'test123' },
          },
        },
      },
      CallToolResultSchema,
    )

    expect(toolCallResult).toBeDefined()
    expect(toolCallResult).toHaveProperty('content')
    expect(toolCallResult).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Invalid URL",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `)

    const searchResult = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'GET_api_search',
          arguments: {
            query: { q: 'test query', limit: 5 },
          },
        },
      },
      CallToolResultSchema,
    )

    expect(searchResult).toBeDefined()
    expect(searchResult).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Invalid URL",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `)
  })
})
