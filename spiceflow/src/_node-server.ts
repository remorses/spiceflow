import {
  type Server,
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from 'node:http'
import * as errore from 'errore'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { AddressInfo } from 'node:net'
import { SpiceflowRequest } from './spiceflow.js'

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const code = Reflect.get(error, 'code')
  if (typeof code !== 'string') return undefined
  return code
}

export function shouldIgnoreRequestError(error: unknown): boolean {
  if (errore.isAbortError(error)) return true

  const code = getErrorCode(error)
  if (code === 'ERR_STREAM_PREMATURE_CLOSE') return true
  if (code === 'ERR_STREAM_UNABLE_TO_PIPE') return true

  return false
}

function getAddressInfo(server: Server): AddressInfo {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Node server did not expose an AddressInfo')
  }
  return address
}

export async function listenForNode(
  handler: (request: Request) => Promise<Response> | Response,
  port: number,
  hostname: string = '0.0.0.0',
): Promise<{
  port: number
  server: Server<typeof IncomingMessage, typeof ServerResponse>
  stop: () => Promise<void>
}> {
  const server = createServer(async (req, res) => {
    try {
      const request = nodeToWebRequest(req, res)
      const response = await handler(request)
      await sendWebResponse(response, res)
    } catch (error) {
      if (shouldIgnoreRequestError(error)) return

      console.error('Error handling request:', error)
      if (res.destroyed || res.writableEnded) return
      res.statusCode = 500
      const message = error instanceof Error ? error.message : 'Internal Server Error'
      res.end(JSON.stringify({ message, ...(error instanceof Error && error.stack ? { stack: error.stack } : {}) }))
    }
  })

  await new Promise((resolve) => {
    server.listen(port, hostname, () => {
      const addressInfo = getAddressInfo(server)
      const displayedHost =
        addressInfo.address === '0.0.0.0' ? 'localhost' : addressInfo.address
      console.log(`Listening on http://${displayedHost}:${addressInfo.port}`)
      resolve(null)
    })
  })

  const actualPort = getAddressInfo(server).port

  const stop = () => {
    return new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }

  return { port: actualPort, server, stop }
}

export function nodeToWebRequest(
  req: IncomingMessage,
  res: ServerResponse,
): SpiceflowRequest {
  const abortController = new AbortController()
  req.once('error', () => abortController.abort())
  res.once('close', () => {
    if (!res.writableFinished) abortController.abort()
  })

  const url = new URL(
    req.url || '',
    `http://${req.headers.host || 'localhost'}`,
  )

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

  const request = new SpiceflowRequest(url.toString(), {
    method: req.method,
    headers: newHeadersFromIncoming(req),
    body: hasBody
      ? (Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>)
      : null,
    signal: abortController.signal,
    // @ts-ignore for undici
    duplex: hasBody ? 'half' : undefined,
  })
  return request
}

// Use rawHeaders to preserve original casing and handle duplicate headers properly
// (e.g. multiple set-cookie). Skips HTTP/2 pseudo-headers starting with ':'
function newHeadersFromIncoming(incoming: IncomingMessage): Headers {
  const headerRecord: [string, string][] = []
  const rawHeaders = incoming.rawHeaders
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const key = rawHeaders[i]
    const value = rawHeaders[i + 1]
    if (key.charCodeAt(0) !== /* ':' */ 0x3a) {
      headerRecord.push([key, value])
    }
  }
  return new Headers(headerRecord)
}

export async function sendWebResponse(
  response: Response,
  res: ServerResponse,
): Promise<void> {
  // Build headers object, handling multiple set-cookie headers correctly.
  // Object.fromEntries(response.headers.entries()) collapses duplicate set-cookie
  // into a single value — we need to preserve them as an array.
  const headers: Record<string, string | string[]> = Object.fromEntries(
    response.headers,
  )
  const setCookies = response.headers.getSetCookie()
  if (setCookies.length > 0) {
    delete headers['set-cookie']
    res.setHeader('set-cookie', setCookies)
  }

  if (response.body) {
    res.writeHead(response.status, response.statusText, headers)
    // pipeline() handles backpressure, error propagation, and cleanup on premature close.
    // Unlike manual pipe() + event listeners, pipeline settles correctly when the client
    // disconnects (emits 'close' without 'error').
    await pipeline(Readable.fromWeb(response.body as any), res)
  } else {
    res.writeHead(response.status, response.statusText, headers)
    res.end()
  }
}

export async function handleForNode(
  app: import('./spiceflow.js').AnySpiceflow,
  req: IncomingMessage,
  res: ServerResponse,
  context: { state?: {} | undefined } = {},
): Promise<void> {
  if (req?.['body']) {
    throw new Error(
      'req.body is defined, you should disable your framework body parser to be able to use the request in Spiceflow',
    )
  }
  const request = nodeToWebRequest(req, res)
  try {
    const response = await app.handle(request, context)
    await sendWebResponse(response, res)
  } catch (error) {
    if (shouldIgnoreRequestError(error)) return

    console.error('Error handling request:', error)
    if (res.destroyed || res.writableEnded) return
    res.statusCode = 500
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    res.end(JSON.stringify({ message, ...(error instanceof Error && error.stack ? { stack: error.stack } : {}) }))
  }
}
