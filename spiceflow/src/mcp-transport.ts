// https://github.com/modelcontextprotocol/typescript-sdk/blob/3164da64d085ec4e022ae881329eee7b72f208d4/src/server/sse.ts
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'node:crypto'

/**
 * Server transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 *
 * This transport is only available in Node.js environments.
 */
export class SSEServerTransportSpiceflow implements Transport {
  private _sessionId: string
  private _endpoint: string
  private _writableStream?: WritableStreamDefaultWriter<Uint8Array>
  response?: Response

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  /**
   * Creates a new SSE server transport, which will direct the client to POST messages to the relative or absolute URL identified by `_endpoint`.
   */
  constructor(endpoint: string) {
    this._sessionId = randomUUID()
    this._endpoint = endpoint
  }

  /**
   * Handles the initial SSE connection request.
   *
   * This should be called when a GET request is made to establish the SSE stream.
   */
  async start(): Promise<void> {
    if (this.response) {
      throw new Error(
        'SSEServerTransport already started! If using Server class, note that connect() calls start() automatically.',
      )
    }

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      // https://github.com/vercel/next.js/issues/9965
      'content-encoding': 'none',
      Connection: 'keep-alive',
    })

    // Create a TransformStream
    const transformStream = new TransformStream()
    const { readable, writable } = transformStream

    // Create the Response from the readable side
    this.response = new Response(readable, { headers })

    // Obtain a writer from the writable end
    this._writableStream = writable.getWriter()
    this._writableStream?.write(
      new TextEncoder().encode(
        `event: endpoint\ndata: ${encodeURI(this._endpoint)}?sessionId=${
          this._sessionId
        }\n\n`,
      ),
    )

    // readable.getReader().closed.then(() => {
    //   this.response = undefined
    //   this._writableStream = undefined
    //   this.onclose?.()
    // })
  }

  /**
   * Handles incoming POST messages.
   *
   * This should be called when a POST request is made to send a message to the server.
   */
  async handlePostMessage(
    req: Request,
    parsedBody?: unknown,
  ): Promise<Response> {
    if (!this.response) {
      const message = 'SSE connection not established'
      throw new Error(message)
    }

    let body = await req.json()

    try {
      await this.handleMessage(
        typeof body === 'string' ? JSON.parse(body) : body,
      )
    } catch {
      return new Response(`Invalid message: ${body}`, { status: 400 })
    }

    return new Response('Accepted', { status: 202 })
  }

  /**
   * Handle a client message, regardless of how it arrived. This can be used to inform the server of messages that arrive via a means different than HTTP POST.
   */
  async handleMessage(message: unknown): Promise<void> {
    let parsedMessage: JSONRPCMessage
    try {
      parsedMessage = JSONRPCMessageSchema.parse(message)
    } catch (error) {
      this.onerror?.(error as Error)
      throw error
    }

    this.onmessage?.(parsedMessage)
  }

  async close(): Promise<void> {
    if (this._writableStream) {
      await this._writableStream.close()
    }
    this.response = undefined
    this._writableStream = undefined
    this.onclose?.()
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._writableStream) {
      throw new Error('Not connected')
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(
      `event: message\ndata: ${JSON.stringify(message)}\n\n`,
    )

    await this._writableStream.write(data)
  }

  /**
   * Returns the session ID for this transport.
   *
   * This can be used to route incoming POST requests.
   */
  get sessionId(): string {
    return this._sessionId
  }
}
