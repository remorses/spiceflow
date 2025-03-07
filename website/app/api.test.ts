import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import {
  ListResourcesResultSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { test, expect } from 'vitest'

test('list', async () => {
  const client = new Client(
    {
      name: 'example-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    },
  )
  const port = 5173
  const transport = new SSEClientTransport(
    new URL(`http://localhost:${port}/api/mcp`),
  )
  await client.connect(transport)
  const resources = await client.request(
    { method: 'tools/list' },
    ListToolsResultSchema,
  )
})
