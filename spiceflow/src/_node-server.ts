import {
  type Server,
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from 'node:http'
import { AddressInfo } from 'node:net'
import { AnySpiceflow, type Spiceflow, SpiceflowRequest } from './spiceflow.ts'

export async function listenForNode(
  app: AnySpiceflow,
  port: number,
  hostname: string = '0.0.0.0',
): Promise<{port: number, server: Server<typeof IncomingMessage, typeof ServerResponse>}> {
  const server = createServer((req, res) => {
    return app.handleForNode(req, res)
  })

  await new Promise((resolve) => {
    server.listen(port, hostname, () => {
      // We could print from what we take as arguments of `serve`, but by reading
      // the `server` object, we can ensure that they are properly set.
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

export async function handleForNode(
  app: AnySpiceflow,
  req: IncomingMessage,
  res: ServerResponse,
  context: { state?: {} | undefined } = {},
): Promise<void> {
  if (req?.['body']) {
    throw new Error(
      'req.body is defined, you should disable your framework body parser to be able to use the request in Spiceflow',
    )
  }

  const abortController = new AbortController()
  const { signal } = abortController

  req.on('error', (err) => {
    abortController.abort()
  })
  req.on('aborted', (err) => {
    abortController.abort()
  })
  res.on('close', function () {
    let aborted = !res.writableFinished
    if (aborted) {
      abortController.abort()
    }
  })

  const url = new URL(
    req.url || '',
    `http://${req.headers.host || 'localhost'}`,
  )
  const typedRequest = new SpiceflowRequest(url.toString(), {
    method: req.method,
    headers: req.headers as HeadersInit,
    body:
      req.method !== 'GET' && req.method !== 'HEAD'
        ? new ReadableStream({
            start(controller) {
              req.on('data', (chunk) => {
                controller.enqueue(
                  new Uint8Array(
                    chunk.buffer,
                    chunk.byteOffset,
                    chunk.byteLength,
                  ),
                )
              })
              req.on('end', () => {
                controller.close()
              })
            },
          })
        : null,
    signal,
    // @ts-ignore
    duplex: 'half',
  })

  try {
    const response = await app.handle(typedRequest, context)
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
  } catch (error) {
    console.error('Error handling request:', error)
    res.statusCode = 500
    res.end(JSON.stringify({ message: 'Internal Server Error' }))
  }
}
