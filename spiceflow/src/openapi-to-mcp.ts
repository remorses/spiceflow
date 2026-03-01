import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// import deref from 'dereference-json-schema'

import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { OpenAPIV3 } from 'openapi-types'

function getOperationRequestBody(
  operation: OpenAPIV3.OperationObject,
): OpenAPIV3.SchemaObject | undefined {
  if (!operation.requestBody) return undefined

  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject
  const content = requestBody.content['application/json']
  return content?.schema as OpenAPIV3.SchemaObject
}

function getOperationParameters(operation: OpenAPIV3.OperationObject): {
  queryParams?: OpenAPIV3.SchemaObject
  pathParams?: OpenAPIV3.SchemaObject
  headerParams?: OpenAPIV3.SchemaObject
  cookieParams?: OpenAPIV3.SchemaObject
} {
  if (!operation.parameters) return {}

  const queryProperties: Record<string, OpenAPIV3.SchemaObject> = {}
  const pathProperties: Record<string, OpenAPIV3.SchemaObject> = {}
  const headerProperties: Record<string, OpenAPIV3.SchemaObject> = {}
  const cookieProperties: Record<string, OpenAPIV3.SchemaObject> = {}
  const queryRequired: string[] = []
  const pathRequired: string[] = []
  const headerRequired: string[] = []
  const cookieRequired: string[] = []

  operation.parameters.forEach((param) => {
    const paramObj = param as OpenAPIV3.ParameterObject
    if (paramObj.in === 'query') {
      queryProperties[paramObj.name] = paramObj.schema as OpenAPIV3.SchemaObject
      if (paramObj.required) queryRequired.push(paramObj.name)
    } else if (paramObj.in === 'path') {
      pathProperties[paramObj.name] = paramObj.schema as OpenAPIV3.SchemaObject
      if (paramObj.required) pathRequired.push(paramObj.name)
    } else if (paramObj.in === 'header') {
      headerProperties[paramObj.name] =
        paramObj.schema as OpenAPIV3.SchemaObject
      if (paramObj.required) headerRequired.push(paramObj.name)
    } else if (paramObj.in === 'cookie') {
      cookieProperties[paramObj.name] =
        paramObj.schema as OpenAPIV3.SchemaObject
      if (paramObj.required) cookieRequired.push(paramObj.name)
    }
  })

  const result: {
    queryParams?: OpenAPIV3.SchemaObject
    pathParams?: OpenAPIV3.SchemaObject
    headerParams?: OpenAPIV3.SchemaObject
    cookieParams?: OpenAPIV3.SchemaObject
  } = {}

  if (Object.keys(queryProperties).length > 0) {
    result.queryParams = {
      type: 'object',
      properties: queryProperties,
      required: queryRequired.length > 0 ? queryRequired : undefined,
    }
  }

  if (Object.keys(pathProperties).length > 0) {
    result.pathParams = {
      type: 'object',
      properties: pathProperties,
      required: pathRequired.length > 0 ? pathRequired : undefined,
    }
  }

  if (Object.keys(headerProperties).length > 0) {
    result.headerParams = {
      type: 'object',
      properties: headerProperties,
      required: headerRequired.length > 0 ? headerRequired : undefined,
    }
  }

  if (Object.keys(cookieProperties).length > 0) {
    result.cookieParams = {
      type: 'object',
      properties: cookieProperties,
      required: cookieRequired.length > 0 ? cookieRequired : undefined,
    }
  }

  return result
}
function extractApiFromBaseUrl(openapi: OpenAPIV3.Document): string {
  if (openapi.servers && openapi.servers.length > 0) {
    return openapi.servers[0].url
  }
  return ''
}

function getAuthHeaders(
  openapi: OpenAPIV3.Document,
  operation?: OpenAPIV3.OperationObject,
): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = process.env.API_TOKEN

  if (!token || !openapi.components?.securitySchemes) {
    return headers
  }

  const securitySchemes = openapi.components.securitySchemes
  let selectedScheme: OpenAPIV3.SecuritySchemeObject | null = null

  // Check for operation-specific security requirements first
  if (operation?.security && operation.security.length > 0) {
    const firstSecurityReq = operation.security[0]
    const operationSchemeNames = Object.keys(firstSecurityReq)

    for (const schemeName of operationSchemeNames) {
      const scheme = securitySchemes[schemeName]
      if (scheme) {
        selectedScheme = scheme as OpenAPIV3.SecuritySchemeObject
        break
      }
    }
  }

  // If no operation-specific scheme found, use the first available scheme
  if (!selectedScheme) {
    const schemes = Object.values(securitySchemes)
    if (schemes.length > 0) {
      selectedScheme = schemes[0] as OpenAPIV3.SecuritySchemeObject
    }
  }

  if (!selectedScheme) {
    return headers
  }

  // Set headers based on scheme type
  switch (selectedScheme.type) {
    case 'http':
      if (selectedScheme.scheme === 'bearer') {
        headers['Authorization'] = `Bearer ${token}`
      } else if (selectedScheme.scheme === 'basic') {
        headers['Authorization'] = `Basic ${token}`
      }
      break
    case 'apiKey':
      if (selectedScheme.in === 'header') {
        headers[selectedScheme.name] = token
      }
      break
    case 'oauth2':
      headers['Authorization'] = `Bearer ${token}`
      break
  }

  return headers
}

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
const defaultFetch = fetch

export function createMCPServer({
  name = 'spiceflow',
  version = '1.0.0',
  openapi,
  server,
  fetch = defaultFetch,
  paths,
  ignorePaths,
  baseUrl = '',
}: {
  name?: string
  version?: string
  openapi: OpenAPIV3.Document
  server?: McpServer
  fetch?: Fetch
  paths?: string[]
  ignorePaths?: string[]
  baseUrl?: string
}) {
  const mcpServer =
    server ||
    new McpServer(
      { name, version },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    )
  mcpServer.server.registerCapabilities({
    tools: {},
    resources: {},
    ...mcpServer.server.getClientCapabilities(),
  })
  // openapi = deref.dereferenceSync(openapi)
  if (!baseUrl) {
    baseUrl = extractApiFromBaseUrl(openapi)
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  async function fetchWithBaseServerAndAuth(
    u: string,
    options: RequestInit,
    operation?: OpenAPIV3.OperationObject,
    userHeaders?: Record<string, string>,
    userCookies?: Record<string, string>,
  ) {
    const authHeaders = getAuthHeaders(openapi, operation)

    // Build cookie string from userCookies
    let cookieHeader = ''
    if (userCookies && Object.keys(userCookies).length > 0) {
      cookieHeader = Object.entries(userCookies)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join('; ')
    }

    const commonHeaders: Record<string, string> = {}

    const finalHeaders: Record<string, string> = {
      ...commonHeaders,
      ...(userHeaders || {}),
      ...authHeaders,
      ...((options?.headers as Record<string, string>) || {}),
    }

    if (cookieHeader) {
      // Merge with existing Cookie header if present
      const existingCookie = finalHeaders['Cookie'] || finalHeaders['cookie']
      finalHeaders['Cookie'] = existingCookie
        ? `${existingCookie}; ${cookieHeader}`
        : cookieHeader
    }

    console.error(`using headers ${JSON.stringify(finalHeaders, null, 2)}`)

    return await fetch!(new URL(u, baseUrl), {
      ...options,
      headers: finalHeaders,
    })
  }

  mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => {
    const filteredPaths = Object.entries(openapi.paths).filter(([path]) => {
      if (ignorePaths?.includes(path)) return false
      if (paths && paths.length > 0) {
        return paths.some((filterPath) => path.startsWith(filterPath))
      }
      return true
    })

    const tools = filteredPaths.flatMap(([path, pathObj]) =>
      Object.entries(pathObj || {})
        // .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => {
          const properties: Record<string, any> = {}
          const required: string[] = []

          const requestBody = getOperationRequestBody(
            operation as OpenAPIV3.OperationObject,
          )
          if (requestBody) {
            properties.body = requestBody
            required.push('body')
          }

          const { queryParams, pathParams, headerParams, cookieParams } =
            getOperationParameters(operation as OpenAPIV3.OperationObject)
          if (queryParams) {
            properties.query = queryParams
          }
          if (pathParams) {
            properties.params = pathParams
          }
          if (headerParams) {
            properties.headers = headerParams
          }
          if (cookieParams) {
            properties.cookies = cookieParams
          }
          let description = `${method.toUpperCase()} route for ${baseUrl}${path}`
          let moreDescription =
            (operation as OpenAPIV3.OperationObject).description ||
            (operation as OpenAPIV3.OperationObject).summary
          if (moreDescription) {
            description += '. '
            description += moreDescription
          }

          return {
            name: getRouteName({ method, path }),
            description,
            inputSchema: {
              type: 'object',
              properties,
              required: required.length > 0 ? required : undefined,
            },
          }
        }),
    )

    return { tools }
  })

  mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name
    let { path, method } = getPathFromToolName(toolName)

    const pathObj = openapi.paths[path]
    if (!pathObj || !pathObj[method.toLowerCase()]) {
      return {
        content: [{ type: 'text', text: `Tool ${toolName} not found` }],
        isError: true,
      }
    }

    try {
      const args = request.params.arguments || {}
      const { body, query, params } = args
      const userHeaders = args.headers as Record<string, string> | undefined
      const userCookies = args.cookies as Record<string, string> | undefined
      const operation = pathObj[
        method.toLowerCase()
      ] as OpenAPIV3.OperationObject

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
        })
      }

      if (query) {
        const searchParams = new URLSearchParams()
        Object.entries(query).forEach(([key, value]) => {
          searchParams.set(key, String(value))
        })
        path += `?${searchParams.toString()}`
      }

      const response = await fetchWithBaseServerAndAuth(
        path,
        {
          method,
          headers: {
            'content-type': 'application/json',
          },
          body: body
            ? typeof body === 'string'
              ? body
              : JSON.stringify(body)
            : undefined,
        },
        operation,
        userHeaders,
        userCookies,
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

  mcpServer.server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources: { uri: string; mimeType: string; name: string }[] = []
    for (const [path, pathObj] of Object.entries(openapi.paths)) {
      if (path.startsWith('/mcp')) {
        continue
      }
      const getOperation = pathObj?.get as OpenAPIV3.OperationObject
      if (getOperation && !path.includes('{')) {
        const { queryParams, headerParams, cookieParams } =
          getOperationParameters(getOperation)
        const hasRequiredQuery =
          queryParams?.required && queryParams.required.length > 0
        const hasRequiredHeaders =
          headerParams?.required && headerParams.required.length > 0
        const hasRequiredCookies =
          cookieParams?.required && cookieParams.required.length > 0

        if (!hasRequiredQuery && !hasRequiredHeaders && !hasRequiredCookies) {
          resources.push({
            uri: path,
            mimeType: 'application/json',
            name: `GET ${path}`,
          })
        }
      }
    }
    return { resources: [] }
  })

  mcpServer.server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request) => {
      // TODO add resources handler
      throw new Error('Resources are not supported - use tools instead')
    },
  )

  return { server: mcpServer }
}

function getRouteName({
  method,
  path,
}: {
  method: string
  path: string
}): string {
  return formatToolName(`${method.toUpperCase()} ${path}`, method, path)
}

const toolNameToPath = new Map<string, { method: string; path: string }>()

function getPathFromToolName(toolName: string): {
  path: string
  method: string
} {
  const cached = toolNameToPath.get(toolName)
  if (cached) {
    return cached
  }
  throw new Error(
    `Tool name '${toolName}' not found. It might not have been registered or was invalid.`,
  )
}

function formatToolName(
  nameToFormat: string,
  method: string,
  pathForMap: string,
): string {
  if (!nameToFormat || nameToFormat.trim() === '') {
    throw new Error('Original tool name for formatting cannot be empty')
  }

  // Replace spaces and other invalid characters with underscores
  let formatted = nameToFormat
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores

  // Truncate to 64 characters if necessary
  if (formatted.length > 64) {
    formatted = formatted.substring(0, 64)
  }

  // Remove trailing underscores again in case truncation created them or they persisted
  formatted = formatted.replace(/_+$/, '')

  if (formatted === '') {
    throw new Error(
      `Tool name results in empty string after formatting (from original: '${nameToFormat}')`,
    )
  }

  // Validate against regex
  const regex = /^[a-zA-Z0-9_-]{1,64}$/
  if (!regex.test(formatted)) {
    throw new Error(
      `Formatted tool name "${formatted}" (from original: '${nameToFormat}') does not match required pattern: ^[a-zA-Z0-9_-]{1,64}$`,
    )
  }

  // Check for duplicates: if this formatted name already exists and belongs to a DIFFERENT tool (method/path), it's a collision.
  const existingEntry = toolNameToPath.get(formatted)
  if (
    existingEntry &&
    (existingEntry.method !== method || existingEntry.path !== pathForMap)
  ) {
    console.error(
      new Error(
        `Duplicate tool name generated: '${formatted}'. ` +
          `This name was generated for original: '${nameToFormat}' (method: '${method}', path: '${pathForMap}'). ` +
          `It conflicts with an existing tool that also maps to '${formatted}', originally from (method: '${existingEntry.method}', path: '${existingEntry.path}'). ` +
          `Ensure operationIds or path/method combinations in your OpenAPI spec are sufficiently unique to avoid naming collisions after formatting.`,
      ),
    )
  }

  // Register the name with its method and path.
  // If the same tool (method/path) is formatted again to the same name, this just overwrites with identical values.
  toolNameToPath.set(formatted, { method, path: pathForMap })

  return formatted
}
