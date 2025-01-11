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

export interface McpOpenApiConfig {
    path?: string
    name?: string
    version?: string
}

export const mcpOpenApi = ({
    path = '/mcp',
    name = 'spiceflow',
    version = '1.0.0',
}: McpOpenApiConfig = {}) => {
    return async (app: Spiceflow) => {
        // Get OpenAPI spec from the app
        const openapiPlugin = openapi({})
        const openapiApp = new Spiceflow().use(openapiPlugin)
        openapiApp.topLevelApp = app
        
        const openapiResponse = await openapiApp.handle(new Request('http://localhost/openapi'))
        const spec = await openapiResponse.json() as OpenAPIV3.Document

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
                const sessionId = query.sessionId!
                const t = transports.get(sessionId)
                if (!t) {
                    return new Response('Session not found', { status: 404 })
                }
                await t.handlePostMessage(request)
                return 'ok'
            })
            .get(path, async ({ request }) => {
                const transport = new SSEServerTransportSpiceflow(messagePath)
                transports.set(transport.sessionId, transport)
                server.onclose = () => {
                    transports.delete(transport.sessionId)
                }
                await server.connect(transport)

                request.signal.addEventListener('abort', () => {
                    transport.close().catch((error) => {
                        console.error('Error closing transport:', error)
                    })
                })

                if (request.method === 'POST') {
                    return await transport.handlePostMessage(request)
                }

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
                                    required.push('body')
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
                                        k === 'body' || 
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

                    // Replace path parameters
                    if (params) {
                        Object.entries(params).forEach(([key, value]) => {
                            path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
                        })
                    }

                    const url = new URL(path, 'http://localhost')
                    if (query) {
                        Object.entries(query).forEach(([key, value]) => {
                            url.searchParams.set(key, String(value))
                        })
                    }

                    try {
                        const response = await app.handle(
                            new Request(url, {
                                method,
                                headers: {
                                    'content-type': 'application/json',
                                },
                                body: body ? JSON.stringify(body) : undefined,
                            }),
                        )

                        const isError = !response.ok
                        const contentType = response.headers.get('content-type')

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
                            uri: new URL(path, `http://${request.headers.get('host')}`).href,
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