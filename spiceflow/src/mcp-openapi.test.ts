import { describe, it, expect, beforeAll } from 'vitest'
import { EventSource } from 'eventsource'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import {
    ListResourcesResultSchema,
    ListToolsResultSchema,
    CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { mcpOpenApi } from './mcp-openapi.js'
import { Spiceflow } from './spiceflow.js'
import { z } from 'zod'

describe('OpenAPI MCP Plugin', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).EventSource = EventSource

    let app: Spiceflow
    let port: number
    let client: Client
    let transport: SSEClientTransport

    beforeAll(async () => {
        port = await getAvailablePort()

        // Create a test API
        app = new Spiceflow()
            .get('/users', () => ({ users: [{ id: 1, name: 'John' }] }))
            .post('/users', ({ body }) => ({ id: 2, ...body }), {
                body: z.object({
                    name: z.string(),
                }),
            })
            .get('/users/:id', ({ params }) => ({ id: params.id, name: 'John' }), {
                params: z.object({
                    id: z.string(),
                }),
            })
            .get('/search', ({ query }) => ({ results: [`Found results for: ${query.q}`] }), {
                query: z.object({
                    q: z.string().describe('Search query'),
                    limit: z.number().optional().describe('Max results'),
                }),
            })

        // Apply MCP plugin
        app = app.use(await mcpOpenApi()(app))

        await app.listen(port)

        transport = new SSEClientTransport(new URL(`http://localhost:${port}/mcp`))

        client = new Client(
            {
                name: 'test-client',
                version: '1.0.0',
            },
            {
                capabilities: {},
            },
        )

        await client.connect(transport)
    })

    it('should list available tools', async () => {
        const tools = await client.request(
            { method: 'tools/list' },
            ListToolsResultSchema,
        )

        expect(tools).toBeDefined()
        expect(tools.tools).toHaveLength(4)
        expect(tools.tools.map(t => t.name).sort()).toEqual([
            'GET /search',
            'GET /users',
            'GET /users/{id}',
            'POST /users',
        ].sort())

        // Verify schema for POST /users
        const postUser = tools.tools.find(t => t.name === 'POST /users')
        expect(postUser?.inputSchema.properties.body).toMatchObject({
            type: 'object',
            properties: {
                name: { type: 'string' },
            },
            required: ['name'],
        })

        // Verify schema for GET /search
        const search = tools.tools.find(t => t.name === 'GET /search')
        expect(search?.inputSchema.properties.query).toMatchObject({
            type: 'object',
            properties: {
                q: { type: 'string', description: 'Search query' },
                limit: { type: 'number', description: 'Max results' },
            },
            required: ['q'],
        })
    })

    it('should list available resources', async () => {
        const resources = await client.request(
            { method: 'resources/list' },
            ListResourcesResultSchema,
        )

        expect(resources).toBeDefined()
        expect(resources.resources).toHaveLength(1)
        expect(resources.resources[0]).toMatchObject({
            name: 'GET /users',
            mimeType: 'application/json',
            uri: `http://localhost:${port}/users`,
        })
    })

    it('should call tools successfully', async () => {
        // Test GET /users
        const getUsers = await client.request(
            {
                method: 'tools/call',
                params: {
                    name: 'GET /users',
                },
            },
            CallToolResultSchema,
        )

        expect(getUsers.isError).toBe(false)
        expect(JSON.parse(getUsers.content[0].text)).toMatchObject({
            users: [{ id: 1, name: 'John' }],
        })

        // Test POST /users
        const createUser = await client.request(
            {
                method: 'tools/call',
                params: {
                    name: 'POST /users',
                    arguments: {
                        body: { name: 'Jane' },
                    },
                },
            },
            CallToolResultSchema,
        )

        expect(createUser.isError).toBe(false)
        expect(JSON.parse(createUser.content[0].text)).toMatchObject({
            id: 2,
            name: 'Jane',
        })

        // Test GET /users/{id}
        const getUser = await client.request(
            {
                method: 'tools/call',
                params: {
                    name: 'GET /users/{id}',
                    arguments: {
                        params: { id: '1' },
                    },
                },
            },
            CallToolResultSchema,
        )

        expect(getUser.isError).toBe(false)
        expect(JSON.parse(getUser.content[0].text)).toMatchObject({
            id: '1',
            name: 'John',
        })

        // Test GET /search
        const search = await client.request(
            {
                method: 'tools/call',
                params: {
                    name: 'GET /search',
                    arguments: {
                        query: { q: 'test', limit: 10 },
                    },
                },
            },
            CallToolResultSchema,
        )

        expect(search.isError).toBe(false)
        expect(JSON.parse(search.content[0].text)).toMatchObject({
            results: ['Found results for: test'],
        })
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