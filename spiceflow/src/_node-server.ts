import {
  type Server,
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { AddressInfo } from 'node:net'
import { SpiceflowRequest } from './spiceflow.js'

export async function listenForNode(
  handler: (request: Request) => Promise<Response> | Response,
  port: number,
  hostname: string = '0.0.0.0',
): Promise<{port: number, server: Server<typeof IncomingMessage, typeof ServerResponse>}> {
  const server = createServer(async (req, res) => {
    try {
      const request = nodeToWebRequest(req, res)
      const response = await handler(request)
      await sendWebResponse(response, res)
    } catch (error) {
      console.error('Error handling request:', error)
      res.statusCode = 500
      res.end(JSON.stringify({ message: 'Internal Server Error' }))
    }
  })

  await new Promise((resolve) => {
    server.listen(port, hostname, () => {
      const addressInfo = server.address() as AddressInfo
      const displayedHost =
        addressInfo.address === '0.0.0.0' ? 'localhost' : addressInfo.address
      console.log(`Listening on http://${displayedHost}:${addressInfo.port}`)
      resolve(null)
    })
  })

  const actualPort = (server.address() as AddressInfo).port
  return {port: actualPort, server}
}

export function nodeToWebRequest(req: IncomingMessage, res: ServerResponse): SpiceflowRequest {
  const url = new URL(
    req.url || '',
    `http://${req.headers.host || 'localhost'}`,
  )

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

  const request = new SpiceflowRequest(url.toString(), {
    method: req.method,
    headers: newHeadersFromIncoming(req),
    body: hasBody ? (Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>) : null,
    // @ts-ignore for undici
    duplex: hasBody ? 'half' : undefined,
  })
  // Defer AbortController creation until request.signal is first accessed.
  // Saves ~1% CPU on requests that never check the signal (API routes, static files).
  request._abortSetup = (controller) => {
    if (req.destroyed || res.destroyed || res.writableEnded) {
      controller.abort()
      return
    }
    req.once('error', () => controller.abort())
    res.once('close', () => {
      if (!res.writableFinished) controller.abort()
    })
  }
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

export async function sendWebResponse(response: Response, res: ServerResponse): Promise<void> {
  // Build headers object, handling multiple set-cookie headers correctly.
  // Object.fromEntries(response.headers.entries()) collapses duplicate set-cookie
  // into a single value — we need to preserve them as an array.
  const headers: Record<string, string | string[]> = Object.fromEntries(response.headers)
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
    console.error('Error handling request:', error)
    res.statusCode = 500
    res.end(JSON.stringify({ message: 'Internal Server Error' }))
  }
}
