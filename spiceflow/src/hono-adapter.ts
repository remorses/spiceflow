// Adapter to use Hono middleware inside Spiceflow apps. Creates a real Hono
// app with the middleware mounted, then delegates to it via fetch(). No manual
// Context bridging needed; Hono handles everything natively.
//
// Uses a WeakMap keyed by Request to pass the request-scoped spiceNext to the
// catch-all handler, so the Hono app is built once and reused across requests.

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
  const last = args.at(-1)
  if (typeof last !== 'function') {
    options = last as HonoAdapterOptions<E>
    handlers = args.slice(0, -1) as HonoMiddlewareHandler<E>[]
  } else {
    handlers = args as HonoMiddlewareHandler<E>[]
  }

  // WeakMap keyed by Request for concurrency-safe request-scoped state
  const requestState = new WeakMap<Request, () => Promise<Response>>()

  const app = new Hono<E>()
  for (const handler of handlers) {
    app.use('*', handler)
  }
  app.all('*', async (c) => {
    const spiceNext = requestState.get(c.req.raw)!
    const downstream = await spiceNext()
    // Use c.newResponse so hono merges any #preparedHeaders set by
    // middleware via c.header() before next().
    return c.newResponse(downstream.body, downstream.status as any, Object.fromEntries(downstream.headers))
  })

  return async function honoAdapter(spiceCtx, spiceNext) {
    const env =
      typeof options?.env === 'function'
        ? (options.env as Function)(spiceCtx)
        : options?.env

    const executionCtx = {
      waitUntil: spiceCtx.waitUntil,
      passThroughOnException() {},
    }

    requestState.set(spiceCtx.request, spiceNext)
    try {
      return await app.fetch(spiceCtx.request, env as any, executionCtx as any)
    } finally {
      requestState.delete(spiceCtx.request)
    }
  }
}

export type { HonoMiddlewareHandler, HonoAdapterOptions }
