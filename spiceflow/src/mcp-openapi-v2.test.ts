import { describe, it, expect, beforeAll } from 'vitest'
import { EventSource } from 'eventsource'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import {
    ListResourcesResultSchema,
    ListToolsResultSchema,
    CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { mcpOpenApi } from './mcp-openapi-v2.js'
import { Spiceflow } from './spiceflow.js'
import { z } from 'zod'

describe('OpenAPI MCP Plugin V2', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).EventSource = EventSource

    let app: Spiceflow
    let port: number
    let client: Client
    let transport: SSEClientTransport
    let baseUrl: string

    beforeAll(async () => {
        port = await getAvailablePort()
        baseUrl = `http://localhost:${port}`

        // Create a test API with various endpoint types
        app = new Spiceflow()
            // Simple GET endpoint
            .get('/users', () => ({ users: [{ id: 1, name: 'John' }] }))
            
            // POST endpoint with body validation
            .post('/users', ({ body }) => ({ id: 2, ...body }), {
                body: z.object({
                    name: z.string(),
                }),
            })
            
            // GET endpoint with path parameter
            .get('/users/:id', ({ params }) => ({ id: params.id, name: 'John' }), {
                params: z.object({
                    id: z.string(),
                }),
            })
            
            // GET endpoint with query parameters
            .get('/search', ({ query }) => ({ results: [`Found results for: ${query.q}`] }), {
                query: z.object({
                    q: z.string().describe('Search query'),
                    limit: z.number().optional().describe('Max results'),
                }),
            })
            
            // Streaming endpoint
            .get('/stream', async function* () {
                yield 'Start'
                await new Promise(resolve => setTimeout(resolve, 100))
                yield 'Middle'
                await new Promise(resolve => setTimeout(resolve, 100))
                yield 'End'
            })

        // Apply MCP plugin with explicit base URL
        app = app.use(await mcpOpenApi({ baseUrl })(app))

        await app.listen(port)

        transport = new SSEClientTransport(new URL(`${baseUrl}/mcp`))

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

    it('should list available tools with proper schemas', async () => {
        const tools = await client.request(
            { method: 'tools/list' },
            ListToolsResultSchema,
        )

        expect(tools).toBeDefined()
        expect(tools.tools).toHaveLength(5)
        expect(tools.tools.map(t => t.name).sort()).toEqual([
            'GET /search',
            'GET /stream',
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

        // Verify streaming endpoint description
        const stream = tools.tools.find(t => t.name === 'GET /stream')
        expect(stream?.description).toContain('(Supports streaming via SSE)')
    })

    it('should list available resources', async () => {
        const resources = await client.request(
            { method: 'resources/list' },
            ListResourcesResultSchema,
        )

        expect(resources).toBeDefined()
        expect(resources.resources).toHaveLength(2) // /users and /stream (no params required)
        expect(resources.resources.map(r => r.name).sort()).toEqual([
            'GET /users',
            'GET /stream',
        ].sort())
        expect(resources.resources[0]).toMatchObject({
            mimeType: 'application/json',
            uri: `${baseUrl}/users`,
        })
    })

    it('should handle regular requests successfully', async () => {
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
    })

    it('should handle path parameters correctly', async () => {
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
    })

    it('should handle query parameters correctly', async () => {
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

    it('should handle streaming responses correctly', async () => {
        const stream = await client.request(
            {
                method: 'tools/call',
                params: {
                    name: 'GET /stream',
                },
            },
            CallToolResultSchema,
        )

        expect(stream.isError).toBe(false)
        expect(stream.content).toHaveLength(3)
        expect(stream.content.map(c => c.text)).toEqual(['Start', 'Middle', 'End'])
    })

    it('should handle errors gracefully', async () => {
        // Test invalid path parameter
        const invalidUser = await client.request(
            {
                method: 'tools/call',
                params: {
                    name: 'GET /users/{id}',
                    arguments: {
                        params: { wrong: '1' }, // Wrong parameter name
                    },
                },
            },
            CallToolResultSchema,
        )

        expect(invalidUser.isError).toBe(true)

        // Test missing required query parameter
        const invalidSearch = await client.request(
            {
                method: 'tools/call',
                params: {
                    name: 'GET /search',
                    arguments: {
                        query: { limit: 10 }, // Missing required 'q' parameter
                    },
                },
            },
            CallToolResultSchema,
        )

        expect(invalidSearch.isError).toBe(true)
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