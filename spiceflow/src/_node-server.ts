import {
  type Server,
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from 'node:http'
import { AddressInfo } from 'node:net'

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

export function nodeToWebRequest(req: IncomingMessage, res: ServerResponse): Request {
  const abortController = new AbortController()
  req.on('error', () => abortController.abort())
  req.on('aborted', () => abortController.abort())
  res.on('close', () => {
    if (!res.writableFinished) abortController.abort()
  })

  const url = new URL(
    req.url || '',
    `http://${req.headers.host || 'localhost'}`,
  )
  return new Request(url.toString(), {
    method: req.method,
    headers: req.headers as HeadersInit,
    body:
      req.method !== 'GET' && req.method !== 'HEAD'
        ? new ReadableStream({
            start(controller) {
              req.on('data', (chunk) => {
                controller.enqueue(
                  new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
                )
              })
              req.on('end', () => controller.close())
            },
          })
        : null,
    signal: abortController.signal,
    // @ts-ignore for undici
    duplex: 'half',
  })
}

export async function sendWebResponse(response: Response, res: ServerResponse): Promise<void> {
  res.writeHead(
    response.status,
    Object.fromEntries(response.headers.entries()),
  )
  if (response.body) {
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  }
  res.end()
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
