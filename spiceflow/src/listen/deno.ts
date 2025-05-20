import type { Spiceflow } from 'spiceflow'

export async function listen(
  app: Spiceflow<any, any, any, any, any, any>,
  port: number,
  hostname: string = '0.0.0.0',
): Promise<void> {
  const abortController = new AbortController()

  // We need to defer the moment we print the "Listening..." message because
  // the `onListen()` is executed synchronously, before `serve` is initialized,
  // meaning that we wouldn't be able to read the hostname and port from it.
  // We could print from what we take as arguments of `serve`, but by reading
  // the `server` object, we can ensure that they are properly set.
  const { resolve: resolveListen, promise: promiseListen } =
    Promise.withResolvers<void>()

  const server = Deno.serve({
    port,
    hostname,
    signal: abortController.signal,
    onListen() {
      resolveListen()
    },
    async handler(request) {
      const response = await app.handle(request)
      return response
    },
    onError(error) {
      console.error(error)
      return new Response(
        JSON.stringify({ message: 'Internal Server Error' }),
        {
          status: 500,
        },
      )
    },
  })

  globalThis.addEventListener('beforeunload', () => {
    abortController.abort()
  })

  await promiseListen

  const { addr } = server
  const displayedHost =
    addr.hostname === '0.0.0.0' ? 'localhost' : addr.hostname
  console.log(`Listening on http://${displayedHost}:${addr.port}`)
}
