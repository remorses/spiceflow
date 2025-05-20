import type { Spiceflow } from 'spiceflow'

export async function listen(
  app: Spiceflow<any, any, any, any, any, any>,
  port: number,
  hostname: string = '0.0.0.0',
): Promise<void> {
  const server = Bun.serve({
    port,
    development: (Bun.env.NODE_ENV ?? Bun.env.ENV) !== 'production',
    hostname,
    reusePort: true,
    error(error) {
      console.error(error)
      return new Response(
        JSON.stringify({ message: 'Internal Server Error' }),
        {
          status: 500,
        },
      )
    },
    async fetch(request) {
      const res = await app.handle(request)
      return res
    },
  })

  process.on('beforeExit', () => {
    server.stop()
  })

  const displayedHost =
    server.hostname === '0.0.0.0' ? 'localhost' : server.hostname
  console.log(`Listening on http://${displayedHost}:${server.port}`)
}
