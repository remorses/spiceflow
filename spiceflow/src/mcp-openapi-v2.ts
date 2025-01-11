import { OpenAPIV3 } from 'openapi-types'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { SSEServerTransportSpiceflow } from './mcp-transport.js'
import { Spiceflow } from './spiceflow.js'
import { openapi } from './openapi.js'

/**
 * Configuration options for the OpenAPI-based MCP plugin
 */
export interface McpOpenApiConfig {
    /** Path where the MCP endpoint will be mounted (default: /mcp) */
    path?: string
    /** Name of the MCP server (default: spiceflow) */
    name?: string
    /** Version of the MCP server (default: 1.0.0) */
    version?: string
    /** Base URL for the API (default: derived from request) */
    baseUrl?: string
}

/**
 * Creates an OpenAPI-based MCP plugin for Spiceflow
 * 
 * This plugin converts your API's OpenAPI specification into MCP tools and resources,
 * making it easy to integrate with AI models that support the Model Context Protocol.
 * 
 * @param config Configuration options for the MCP plugin
 * @returns A Spiceflow plugin that implements the MCP protocol
 */
export const mcpOpenApi = ({
    path = '/mcp',
    name = 'spiceflow',
    version = '1.0.0',
    baseUrl,
}: McpOpenApiConfig = {}) => {
    return async (app: Spiceflow) => {
        // Get OpenAPI spec from the app
        const openapiPlugin = openapi({})
        const openapiApp = new Spiceflow().use(openapiPlugin)
        openapiApp.topLevelApp = app
        
        let spec: OpenAPIV3.Document
        try {
            const openapiResponse = await openapiApp.handle(new Request('http://0.0.0.0/openapi'))
            if (!openapiResponse.ok) {
                throw new Error(`Failed to get OpenAPI spec: ${openapiResponse.statusText}`)
            }
            spec = await openapiResponse.json()

            // Add streaming support information to the spec
            for (const [path, pathItem] of Object.entries(spec.paths || {})) {
                for (const [method, operation] of Object.entries(pathItem)) {
                    if (method === 'parameters') continue
                    if (operation['x-fern-streaming']) {
                        operation.description = `${operation.description || ''}\n(Supports streaming via SSE)`
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to generate OpenAPI spec: ${error.message}`)
        }

        const server = new Server(
            { name, version },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            },
        )

        const transports = new Map<string, SSEServerTransportSpiceflow>()
        const messagePath = path + '/message'

        return new Spiceflow({ name: 'mcp' })
            .post(messagePath, async ({ request, query }) => {
                const sessionId = query.sessionId
                if (!sessionId) {
                    return new Response('Missing sessionId query parameter', { status: 400 })
                }

                const transport = transports.get(sessionId)
                if (!transport) {
                    return new Response('Session not found', { status: 404 })
                }

                try {
                    await transport.handlePostMessage(request)
                    return new Response('ok')
                } catch (error) {
                    console.error('Error handling message:', error)
                    return new Response(`Error handling message: ${error.message}`, { status: 500 })
                }
            })
            .get(path, async ({ request }) => {
                const transport = new SSEServerTransportSpiceflow(messagePath)
                transports.set(transport.sessionId, transport)
                
                server.onclose = () => {
                    transports.delete(transport.sessionId)
                }

                try {
                    await server.connect(transport)
                } catch (error) {
                    console.error('Error connecting transport:', error)
                    return new Response(`Error connecting transport: ${error.message}`, { status: 500 })
                }

                request.signal.addEventListener('abort', () => {
                    transport.close().catch((error) => {
                        console.error('Error closing transport:', error)
                    })
                })

                if (request.method === 'POST') {
                    return await transport.handlePostMessage(request)
                }

                // Get base URL from request or config
                const effectiveBaseUrl = baseUrl || `http://${request.headers.get('host')}`

                server.setRequestHandler(ListToolsRequestSchema, async () => {
                    const tools = []
                    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
                        for (const [method, operation] of Object.entries(pathItem)) {
                            if (method === 'parameters') continue

                            const toolName = `${method.toUpperCase()} ${path}`
                            const description = operation.description || operation.summary || toolName

                            const properties: Record<string, any> = {}
                            const required: string[] = []

                            // Handle request body
                            if ('requestBody' in operation && operation.requestBody) {
                                const content = (operation.requestBody as OpenAPIV3.RequestBodyObject).content
                                const jsonContent = content['application/json']
                                if (jsonContent?.schema) {
                                    properties.body = jsonContent.schema
                                    if ((operation.requestBody as OpenAPIV3.RequestBodyObject).required) {
                                        required.push('body')
                                    }
                                }
                            }

                            // Handle parameters
                            const queryProperties: Record<string, any> = {}
                            const queryRequired: string[] = []
                            const pathProperties: Record<string, any> = {}
                            const pathRequired: string[] = []

                            for (const param of (operation.parameters || [])) {
                                const parameter = param as OpenAPIV3.ParameterObject
                                if (parameter.in === 'query') {
                                    queryProperties[parameter.name] = parameter.schema
                                    if (parameter.required) {
                                        queryRequired.push(parameter.name)
                                    }
                                } else if (parameter.in === 'path') {
                                    pathProperties[parameter.name] = parameter.schema
                                    if (parameter.required) {
                                        pathRequired.push(parameter.name)
                                    }
                                }
                            }

                            if (Object.keys(queryProperties).length > 0) {
                                properties.query = {
                                    type: 'object',
                                    properties: queryProperties,
                                    required: queryRequired,
                                }
                            }

                            if (Object.keys(pathProperties).length > 0) {
                                properties.params = {
                                    type: 'object',
                                    properties: pathProperties,
                                    required: pathRequired,
                                }
                            }

                            tools.push({
                                name: toolName,
                                description,
                                inputSchema: {
                                    type: 'object',
                                    properties,
                                    required: Object.keys(properties).filter(k => 
                                        (k === 'body' && (operation.requestBody as OpenAPIV3.RequestBodyObject)?.required) || 
                                        (k === 'params' && pathRequired.length > 0) ||
                                        (k === 'query' && queryRequired.length > 0)
                                    ),
                                },
                            })
                        }
                    }
                    return { tools }
                })

                server.setRequestHandler(CallToolRequestSchema, async (request) => {
                    const toolName = request.params.name
                    const [method, ...pathParts] = toolName.split(' ')
                    let path = pathParts.join(' ')
                    const { body, query, params } = request.params.arguments || {}

                    try {
                        // Replace path parameters
                        if (params) {
                            Object.entries(params).forEach(([key, value]) => {
                                const paramPattern = new RegExp(`{${key}}`, 'g')
                                path = path.replace(paramPattern, encodeURIComponent(String(value)))
                            })
                        }

                        const url = new URL(path, effectiveBaseUrl)
                        if (query) {
                            Object.entries(query).forEach(([key, value]) => {
                                url.searchParams.set(key, String(value))
                            })
                        }

                        const response = await app.handle(
                            new Request(url, {
                                method,
                                headers: {
                                    'content-type': 'application/json',
                                    'accept': 'application/json',
                                },
                                body: body ? JSON.stringify(body) : undefined,
                            }),
                        )

                        const isError = !response.ok
                        const contentType = response.headers.get('content-type')

                        if (contentType?.includes('text/event-stream')) {
                            // Handle streaming response
                            const reader = response.body?.getReader()
                            if (!reader) {
                                throw new Error('No response body available for streaming')
                            }

                            const decoder = new TextDecoder()
                            let buffer = ''
                            const chunks = []

                            while (true) {
                                const { done, value } = await reader.read()
                                if (done) break

                                buffer += decoder.decode(value, { stream: true })
                                const lines = buffer.split('\n')
                                buffer = lines.pop() || ''

                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        chunks.push(line.slice(6))
                                    }
                                }
                            }

                            return {
                                isError,
                                content: chunks.map(chunk => ({ type: 'text', text: chunk })),
                            }
                        }

                        if (contentType?.includes('application/json')) {
                            const json = await response.json()
                            return {
                                isError,
                                content: [{ type: 'text', text: JSON.stringify(json, null, 2) }],
                            }
                        }

                        const text = await response.text()
                        return {
                            isError,
                            content: [{ type: 'text', text }],
                        }
                    } catch (error: any) {
                        console.error('Error calling tool:', error)
                        return {
                            content: [{ type: 'text', text: error.message || 'Unknown error' }],
                            isError: true,
                        }
                    }
                })

                server.setRequestHandler(ListResourcesRequestSchema, async () => {
                    const resources = []
                    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
                        if (!pathItem.get) continue
                        if (path.includes('{')) continue

                        const operation = pathItem.get
                        if (operation.parameters?.some(p => 
                            (p as OpenAPIV3.ParameterObject).required
                        )) {
                            continue
                        }

                        resources.push({
                            uri: new URL(path, effectiveBaseUrl).href,
                            mimeType: 'application/json',
                            name: `GET ${path}`,
                        })
                    }
                    return { resources }
                })

                return transport.response
            })
    }
}