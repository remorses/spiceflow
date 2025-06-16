import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { AnySpiceflow } from './spiceflow.ts'
import { streamSSEResponse } from './client/index.ts'



export type SpiceflowClientTransportClientTransportOptions = {
  app: AnySpiceflow
}

/**
 * Client transport for Apps: this uses the provided app instance locally.
 */
export class SpiceflowClientTransport implements Transport {
  private readonly app: AnySpiceflow

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  constructor(opts: SpiceflowClientTransportClientTransportOptions) {
    if (!opts.app) throw new Error('App instance required')
    this.app = opts.app
  }

  async start(): Promise<void> {
    // Nothing needed for local App-based transport
  }

  async close(): Promise<void> {
    // No-op, since no persistent resources or connections
    this.onclose?.()
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      const basePath = this.app.topLevelApp!.basePath
      const [mcpConfig] = await Promise.all([
        this.app
          .topLevelApp!.handle(
            new Request(`http://localhost${basePath}/_mcp_config`),
          )
          .then((r) => r.json()),
      ])
      const mcpPath = mcpConfig?.path
      const req = new Request(new URL(mcpPath, 'http://localhost/'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(message),
      })

      const res = await this.app.handle(req)

      if (!res.ok) {
        const text = await res.text().catch(() => null)
        throw new Error(
          `AppClientTransport error (HTTP ${res.status}): ${text}`,
        )
      }

      // Parse response body as JSON and validate with schema
      const responseText = await res.text()
      let parsedMsg: JSONRPCMessage
      try {
        parsedMsg = JSONRPCMessageSchema.parse(JSON.parse(responseText))
      } catch (e) {
        throw new Error('Invalid JSON-RPC message in response')
      }

      this.onmessage?.(parsedMsg)
    } catch (err) {
      this.onerror?.(err as Error)
      throw err
    }
  }

  setProtocolVersion(_version: string): void {
    // noop; not used for local app instance
  }
}
