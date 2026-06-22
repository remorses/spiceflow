// Adapter to use Hono middleware inside Spiceflow apps. Constructs a real Hono
// Context and runs middleware directly via koa-style compose, bypassing Hono's
// router dispatch for zero routing overhead.

import { Context } from 'hono'
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
 * Spiceflow. Runs the middleware chain directly on a real Hono `Context`,
 * bypassing Hono's router for minimal overhead.
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

  return async function honoAdapter(spiceCtx, spiceNext) {
    const env =
      typeof options?.env === 'function'
        ? (options.env as Function)(spiceCtx)
        : options?.env ?? {}

    const executionCtx = {
      waitUntil: spiceCtx.waitUntil,
      passThroughOnException() {},
    }

    const c = new Context<E>(spiceCtx.request, {
      env,
      executionCtx,
      path: spiceCtx.path,
    } as any)

    // Koa-style compose: run handlers sequentially, each calling next()
    // to advance to the next handler, with spiceNext as the final handler.
    let index = -1
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error('next() called multiple times')
      index = i

      if (i < handlers.length) {
        const result = await handlers[i](c, () => dispatch(i + 1))
        if (result instanceof Response) {
          c.res = result
        }
        return
      }

      // End of hono middleware chain — call spiceflow's downstream.
      // Use c.newResponse to merge any #preparedHeaders set via c.header().
      const downstream = await spiceNext()
      c.res = c.newResponse(
        downstream.body,
        downstream.status as any,
        Object.fromEntries(downstream.headers),
      )
    }

    await dispatch(0)

    if (!c.finalized) {
      return spiceNext()
    }

    return c.res
  }
}

export type { HonoMiddlewareHandler, HonoAdapterOptions }
