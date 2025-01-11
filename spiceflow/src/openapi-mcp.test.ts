import { describe, it, expect, beforeAll } from 'vitest'
import { EventSource } from 'eventsource'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import {
    ListResourcesResultSchema,
    ListToolsResultSchema,
    CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { mcpFromOpenApi } from './openapi-mcp.js'
import { Spiceflow } from './spiceflow.js'
import { OpenAPIV3 } from 'openapi-types'

describe('OpenAPI MCP Plugin', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).EventSource = EventSource

    let app: Spiceflow
    let port: number
    let client: Client
    let transport: SSEClientTransport

    // Sample OpenAPI spec for testing
    const sampleSpec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
            title: 'Test API',
            version: '1.0.0',
        },
        paths: {
            '/users': {
                get: {
                    summary: 'List users',
                    responses: {
                        '200': {
                            description: 'List of users',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            users: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'number' },
                                                        name: { type: 'string' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    summary: 'Create user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                    },
                                    required: ['name'],
                                },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'User created',
                        },
                    },
                },
            },
            '/users/{id}': {
                get: {
                    summary: 'Get user by ID',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'User details',
                        },
                    },
                },
            },
            '/search': {
                get: {
                    summary: 'Search items',
                    parameters: [
                        {
                            name: 'q',
                            in: 'query',
                            required: true,
                            schema: { type: 'string' },
                        },
                        {
                            name: 'limit',
                            in: 'query',
                            schema: { type: 'number' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Search results',
                        },
                    },
                },
            },
        },
    }

    beforeAll(async () => {
        port = await getAvailablePort()

        // Create a mock API server
        const mockApi = new Spiceflow()
            .get('/users', () => ({ users: [{ id: 1, name: 'John' }] }))
            .post('/users', () => new Response(null, { status: 201 }))
            .get('/users/:id', ({ params }) => ({ id: params.id, name: 'John' }))
            .get('/search', ({ query }) => ({ results: [`Found results for: ${query.q}`] }))

        // Create the MCP server with the OpenAPI spec
        app = new Spiceflow()
            .use(mockApi)
            .use(mcpFromOpenApi({
                spec: sampleSpec,
                baseUrl: `http://localhost:${port}`,
            }))

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
        expect(tools.tools.map(t => t.name)).toEqual([
            'GET /users',
            'POST /users',
            'GET /users/{id}',
            'GET /search',
        ])

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
                q: { type: 'string' },
                limit: { type: 'number' },
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

        // Test GET /search with query parameters
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