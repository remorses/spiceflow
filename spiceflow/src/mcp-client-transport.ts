// fetch version of https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/client/sse.ts
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { streamSSEResponse } from './client/index.ts'

export type SpiceflowClientTransportOptions = {
  fetch?: FetchType
  url: string
}

export type FetchType = (input: Request) => Promise<Response>

export class FetchMCPCLientTransport implements Transport {
  private _endpoint?: URL
  private sseUrl: URL
  private _abortController: AbortController
  fetch: FetchType
  onmessage?: (message: JSONRPCMessage) => void
  onerror?: (error: Error) => void = (e) => {
    throw e
  }
  onclose?: () => void

  constructor(opts: SpiceflowClientTransportOptions) {
    this.fetch = opts.fetch || fetch
    this.sseUrl = new URL(opts.url)
    this._abortController = new AbortController()
  }

  onEndpointMessage: (endpoint: URL) => void = () => {}

  async start(): Promise<void> {
    const { promise, resolve, reject } = withResolvers<URL>()
    this.consumeEvents().catch((e) => {
      reject(e)
    })

    this.onEndpointMessage = (endpoint) => {
      this._endpoint = endpoint
      resolve(endpoint)
    }

    await promise
    this.log(`finished start`)
  }

  log(...x: any[]) {
    // console.log(...x)
    //
  }
  async consumeEvents() {
    const sseRes = await this.fetch(
      new Request(this.sseUrl!.toString(), {
        method: 'GET',
        signal: this._abortController.signal,
        headers: {
          ...(await this._commonHeaders()),
          accept: 'text/event-stream',
        },
      }),
    )
    if (!sseRes.ok || !sseRes.body) {
      const text = sseRes.body ? await sseRes.text().catch(() => '') : ''
      throw new Error(
        `SSE connection failed (HTTP ${sseRes.status})\nURL: ${this.sseUrl}\nText: ${text}`,
      )
    }
    for await (const evt of streamSSEResponse({
      response: sseRes,
      map: (x) => {
        return x
      },
    }) as AsyncGenerator<{
      event: string
      data: any
    }>) {
      if (evt.event === 'endpoint') {
        const url = new URL(evt.data, this.sseUrl)
        if (url.origin !== this.sseUrl.origin) {
          throw new Error(`Endpoint origin mismatch: ${url.origin}`)
        }
        this.onEndpointMessage(url)
        this._endpoint = url
      } else if (evt.event === 'message') {
        // JSON-RPC payload
        try {
          const msg = JSONRPCMessageSchema.parse(JSON.parse(evt.data))
          this.log(msg)
          this.onmessage?.(msg)
        } catch (err) {
          this.onerror?.(err as Error)
        }
      } else {
        this.log('Unknown MCP event:', evt)
      }
    }
    this.close?.()
  }
  catch(err) {
    this.onerror?.(err as Error)
  }

  private async _commonHeaders() {
    const headers = {} as Record<string, string>
    // if (this._authProvider) {
    //   const tokens = await this._authProvider.tokens()
    //   if (tokens) {
    //     headers['Authorization'] = `Bearer ${tokens.access_token}`
    //   }
    // }
    if (this._protocolVersion) {
      headers['mcp-protocol-version'] = this._protocolVersion
    }

    return headers
  }

  /**
   * Sends a JSON-RPC message by POSTing to the negotiated endpoint.
   * Must call start() first so that endpoint is set.
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._endpoint) {
      throw new Error('Not connected')
    }
    this.log(`sending`, message)

    const res = await this.fetch(
      new Request(this._endpoint.toString(), {
        method: 'POST',
        headers: {
          ...(await this._commonHeaders()),
          'content-type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: this._abortController?.signal,
      }),
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(
        `Error POSTing to endpoint ${this._endpoint || '.'} (HTTP ${res.status}): ${text}`,
      )
      this.onerror?.(err)
      throw err
    }
  }

  /**
   * Aborts the SSE stream and notifies onclose.
   */
  async close(): Promise<void> {
    this._abortController?.abort()
    this.onclose?.()
  }

  _protocolVersion?: any
  setProtocolVersion(version: string): void {
    this._protocolVersion = version
  }
}

/**
 * Polyfill for Promise.withResolvers
 * Returns an object { promise, resolve, reject }
 * If native Promise.withResolvers exists, uses it.
 */
function withResolvers<T = unknown>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
} {
  if (typeof Promise.withResolvers === 'function') {
    return Promise.withResolvers()
  }
  let resolve: (value: T | PromiseLike<T>) => void
  let reject: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res!
    reject = rej!
  })
  // @ts-ignore checked by closure above
  return { promise, resolve, reject }
}
