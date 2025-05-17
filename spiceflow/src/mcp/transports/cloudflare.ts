import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import { SSEServerTransportBase } from './base.js'

/**
 * Server transport for SSE in Cloudflare Workers environments:
 * This will send messages over an SSE connection and receive messages from HTTP POST requests.
 */
export class SSEServerTransportCloudflare extends SSEServerTransportBase {
  private controller?: ReadableStreamDefaultController<Uint8Array>
  private stream?: ReadableStream<Uint8Array>
  private encoder = new TextEncoder()

  protected generateSessionId(): string {
    // Use crypto API available in Cloudflare Workers
    return crypto.randomUUID()
  }

  /**
   * Handles the initial SSE connection request.
   */
  async start(): Promise<void> {
    if (this.response) {
      throw new Error(
        'SSEServerTransport already started! If using Server class, note that connect() calls start() automatically.',
      )
    }

    // Create a ReadableStream for the SSE connection
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller
        
        // Send initial event with endpoint information
        const initialEvent = `event: endpoint\ndata: ${encodeURI(this._endpoint)}?sessionId=${
          this._sessionId
        }\n\n`
        
        controller.enqueue(this.encoder.encode(initialEvent))
      },
      cancel: () => {
        this.response = undefined
        this.controller = undefined
        this.onclose?.()
      }
    })

    // Create the response with the stream
    this.response = new Response(this.stream, { headers: this._headers })
  }

  async close(): Promise<void> {
    if (this.controller) {
      this.controller.close()
      this.controller = undefined
    }
    this.response = undefined
    this.onclose?.()
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.controller) {
      throw new Error('Not connected')
    }

    const messageData = `event: message\ndata: ${JSON.stringify(message)}\n\n`
    this.controller.enqueue(this.encoder.encode(messageData))
  }
}
