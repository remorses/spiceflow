import { describe, it, expect } from 'vitest'
import { EventSource } from 'eventsource'

import { mcp } from './mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'

import {
  ListResourcesResultSchema,
  ReadResourceResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { z } from 'zod'
import { Spiceflow } from './spiceflow.js'

describe(
  'MCP Plugin',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).EventSource = EventSource
    it('should create a server with MCP plugin and handle client requests', async () => {
      // Create the server with the MCP plugin

      const port = await getAvailablePort()

      const app = new Spiceflow()
        .use(mcp({ path: '/mcp' }))
        .get('/ids/:id', () => 'hi')
        .post('/ids/:id', ({ params: { id } }) => id, {
          params: z.object({ id: z.string() }),
        })
      await app.listen(port)
      console.log('using mcp client')

      // Setup the client transport using SSEServerTransportSpiceflow
      const transport = new SSEClientTransport(
        new URL(`http://localhost:${port}/mcp`),
      )

      const client = new Client(
        {
          name: 'example-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      )
      console.log('connecting')

      await client.connect(transport)

      // List available resources
      const resources = await client.request(
        { method: 'resources/list' },
        ListResourcesResultSchema,
      )

      console.log({ resources })
      return
      // Validate the resources response
      expect(resources).toBeDefined()
      expect(resources).toHaveProperty('tools')

      // Read a specific resource
      const resourceContent = await client.request(
        {
          method: 'resources/read',
          params: {
            uri: 'file:///example.txt',
          },
        },
        ReadResourceResultSchema,
      )

      // Validate the resource content response
      expect(resourceContent).toBeDefined()
      expect(resourceContent).toHaveProperty('content')
    })
  },
  1000 * 2,
)

async function getAvailablePort(startPort = 3000, maxRetries = 10) {
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
