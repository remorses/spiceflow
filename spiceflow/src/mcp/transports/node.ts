import { Readable } from 'stream'
import { randomUUID } from 'crypto'
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import { SSEServerTransportBase } from './base.js'

/**
 * Server transport for SSE in Node.js environments:
 * This will send messages over an SSE connection and receive messages from HTTP POST requests.
 */
export class SSEServerTransportNode extends SSEServerTransportBase {
  private _readable: Readable

  constructor(endpoint: string) {
    super(endpoint)
    this._readable = new Readable({
      read() {} // This is intentionally empty as we'll push data manually
    })
  }

  protected generateSessionId(): string {
    return randomUUID()
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

    // Create a readable stream that will be the body of the Response
    this._readable.push(
      `event: endpoint\ndata: ${encodeURI(this._endpoint)}?sessionId=${
        this._sessionId
      }\n\n`
    )

    // Create the Response object using the Node.js Readable stream
    this.response = new Response(this._readable as any, { headers: this._headers })

    // Set up stream cleanup when closed
    this._readable.on('close', () => {
      this.response = undefined
      this.onclose?.()
    })
  }

  async close(): Promise<void> {
    this._readable.push(null) // End the stream
    this._readable.destroy()
    this.response = undefined
    this.onclose?.()
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._readable || this._readable.destroyed) {
      throw new Error('Not connected')
    }

    const messageData = `event: message\ndata: ${JSON.stringify(message)}\n\n`
    this._readable.push(messageData)
  }
}
