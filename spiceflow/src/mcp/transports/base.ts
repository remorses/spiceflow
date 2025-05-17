import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Base SSE server transport interface 
 * 
 * This abstract class defines the common functionality needed by all
 * runtime-specific SSE server transport implementations.
 */
export abstract class SSEServerTransportBase implements Transport {
  protected _sessionId: string
  protected _endpoint: string
  protected _headers: Headers
  response?: Response

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  constructor(endpoint: string) {
    // Generate a unique session ID - implementation depends on runtime
    this._sessionId = this.generateSessionId()
    this._endpoint = endpoint
    
    // Common headers for SSE
    this._headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'content-encoding': 'none',
      'Connection': 'keep-alive',
    })
  }

  /**
   * Generate a unique session ID - to be implemented by runtime-specific subclasses
   */
  protected abstract generateSessionId(): string

  /**
   * Creates and configures the response with event stream
   */
  abstract start(): Promise<void>

  /**
   * Handle incoming messages from clients
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
    } catch (error) {
      return new Response(`Invalid message: ${body}`, { status: 400 })
    }

    return new Response('Accepted', { status: 202 })
  }

  /**
   * Process a message from the client
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

  /**
   * Close the connection
   */
  abstract close(): Promise<void>

  /**
   * Send a message to the client through the SSE stream
   */
  abstract send(message: JSONRPCMessage): Promise<void>

  /**
   * Get the session ID
   */
  get sessionId(): string {
    return this._sessionId
  }
}
