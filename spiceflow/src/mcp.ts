import { OpenAPIV3 } from 'openapi-types'
import { SSEServerTransportSpiceflow } from './mcp-transport.ts'
import { createMCPServer } from './openapi-to-mcp.ts'
import { openapi } from './openapi.ts'
import { Spiceflow } from './spiceflow.ts'

const defaultTransports = new Map<string, SSEServerTransportSpiceflow>()

export const mcp = <Path extends string = '/mcp'>({
  path = '/mcp' as Path,
  name = 'spiceflow',
  version = '1.0.0',
  /**
   * Map to get a transport from a sessionId and
   */
  transports = defaultTransports,
} = {}) => {
  const messagePath = path + '/message'

  let app = new Spiceflow({ name: 'mcp' })
    .use(openapi({ path: '/_mcp_openapi' }))
    .route({
      method: 'GET',
      path: '/_mcp_config',
      handler: async () => {
        return {
          name,
          version,
          path,
        }
      },
    })
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
      const basePath = app.topLevelApp!.basePath || ''
      const transport = new SSEServerTransportSpiceflow(basePath + messagePath)
      transports.set(transport.sessionId, transport)

      const [openapi, mcpConfig] = await Promise.all([
        app
          .topLevelApp!.handle(
            new Request(`http://localhost${basePath}/_mcp_openapi`),
          )
          .then((r) => r.json()) as Promise<OpenAPIV3.Document>,
        app
          .topLevelApp!.handle(
            new Request(`http://localhost${basePath}/_mcp_config`),
          )
          .then((r) => r.json()),
      ])
      const mcpPath = mcpConfig?.path
      if (!mcpPath)
        throw new Error(
          'Missing MCP path from app, make sure to use the mcp() Spiceflow plugin',
        )
      const { server } = createMCPServer({
        name,
        version,
        ignorePaths: [
          '/_mcp_openapi',
          '/_mcp_config',
          mcpPath,
          mcpPath + '/message', //
        ],

        fetch: (url, init) => {
          const req = new Request(url, init)
          return app.handle(req)
        },
        openapi,
      })

      server.onclose = () => {
        // transports.delete(transport.sessionId)
      }
      await server.connect(transport)

      request.signal.addEventListener('abort', () => {
        transport.close().catch((error) => {
          console.error('Error closing transport:', error)
        })
      })

      return transport.response
    })

  return app
}
