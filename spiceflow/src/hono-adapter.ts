// Adapter to use Hono middleware inside Spiceflow apps. Creates a real Hono
// app with the middleware mounted, then delegates to it via fetch(). No manual
// Context bridging needed; Hono handles everything natively.
//
// A new Hono app is created per request because the catch-all handler captures
// the request-scoped spiceNext function. Hono apps are lightweight so this is
// fine for middleware execution.

import { Hono } from 'hono'
import type { Env, MiddlewareHandler as HonoMiddlewareHandler } from 'hono'
import type { MiddlewareHandler } from './types.js'
import type { MiddlewareContext } from './context.js'

type HonoAdapterOptions<E extends Env = Env> = {
  /**
   * Cloudflare bindings or other environment bindings passed as `c.env`.
   * Can be a static object or a function that reads from spiceflow's context.
   */
  env?: E['Bindings'] | ((context: MiddlewareContext) => E['Bindings'])
}

/**
 * Wrap one or more Hono `MiddlewareHandler`s so they work with `app.use()` in
 * Spiceflow. Internally creates a Hono app, mounts the middleware, and calls
 * `hono.fetch()` per request. The Hono app's catch-all handler calls through
 * to spiceflow's downstream middleware chain.
 *
 * @example
 * ```ts
 * import { Spiceflow } from 'spiceflow'
 * import { honoMiddleware } from 'spiceflow/hono'
 * import { cors } from 'hono/cors'
 * import { logger } from 'hono/logger'
 *
 * const app = new Spiceflow()
 *   .use(honoMiddleware(cors({ origin: '*' })))
 *   .use(honoMiddleware(logger()))
 *   .get('/hello', () => 'world')
 * ```
 */
export function honoMiddleware<E extends Env = Env>(
  ...args: [...HonoMiddlewareHandler<E>[], HonoAdapterOptions<E>] | HonoMiddlewareHandler<E>[]
): MiddlewareHandler {
  let handlers: HonoMiddlewareHandler<E>[]
  let options: HonoAdapterOptions<E> | undefined
  const last = args[args.length - 1]
  if (typeof last === 'object' && last !== null && !('length' in last)) {
    options = last as HonoAdapterOptions<E>
    handlers = args.slice(0, -1) as HonoMiddlewareHandler<E>[]
  } else {
    handlers = args as HonoMiddlewareHandler<E>[]
  }

  return async function honoAdapter(spiceCtx, spiceNext) {
    const env =
      typeof options?.env === 'function'
        ? (options.env as Function)(spiceCtx)
        : options?.env

    const app = new Hono<E>()
    for (const handler of handlers) {
      app.use('*', handler)
    }
    app.all('*', async (c) => {
      const downstream = await spiceNext()
      // Use c.newResponse so hono merges any #preparedHeaders set by
      // middleware via c.header() before next().
      return c.newResponse(downstream.body, downstream as any)
    })

    return app.fetch(spiceCtx.request, env as any)
  }
}

export type { HonoMiddlewareHandler, HonoAdapterOptions }
