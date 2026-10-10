// Cloudflare Workers middlewares: serveAssets (static assets binding) and
// headersCache (edge cache via the Cache API, caches.default).
//
// headersCache is DEPRECATED: As of July 2026, Cloudflare Workers Cache makes this middleware
// unnecessary for most use cases. Add `"cache": { "enabled": true }` to your
// wrangler.jsonc and set Cache-Control headers on your responses; Cloudflare's
// regionally tiered cache sits in front of your Worker and serves hits without
// running Worker code at all.
// See: https://blog.cloudflare.com/workers-cache/
//
// This middleware still works and may be useful if you need custom cache key
// logic or custom shouldCache predicates that go beyond what wrangler config
// offers. For most apps, prefer the native Workers Cache instead.

import { getStaticPathname, markStaticMiddleware } from './static.js'
import { MiddlewareHandler } from './types.js'
import { withMutableHeaders } from './utils.js'

// Cloudflare extends the standard CacheStorage with a `default` property
// that gives access to the zone's default edge cache without calling
// caches.open(). This type is not in the standard lib DOM types.
declare global {
  interface CacheStorage {
    default: Cache
  }
}

/** The Workers static assets binding (`assets.binding` in wrangler.jsonc). */
type AssetsBinding = { fetch(request: Request): Promise<Response> }

/**
 * Serves files from the Workers static assets binding, including prerendered
 * `staticPage()` HTML and `.rsc` files. It is the Cloudflare version of
 * `serveStatic`: register it after the middlewares that must run first.
 *
 * Use it with `assets.run_worker_first` in wrangler.jsonc. Without that,
 * Cloudflare serves assets before the Worker runs and no middleware runs.
 *
 * @example
 * ```ts
 * import { env } from 'cloudflare:workers'
 * import { serveAssets } from 'spiceflow/cloudflare'
 *
 * export const app = new Spiceflow()
 *   .use(({ request, redirect }) => {
 *     if (new URL(request.url).pathname === '/old-about') throw redirect('/about')
 *   })
 *   .use(serveAssets(env.ASSETS))
 *   .staticPage('/about', async () => <About />)
 * ```
 */
export function serveAssets(assets: AssetsBinding): MiddlewareHandler {
  return markStaticMiddleware(async function serveAssets({ request }, next) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next()

    const url = new URL(request.url)
    url.pathname = getStaticPathname(url)
    const response = await assets.fetch(new Request(url, request))
    if (response.status === 404) {
      await response.body?.cancel()
      return next()
    }

    if (!url.pathname.endsWith('.rsc')) return response
    // The client checks the Flight content type; `_headers` rules may not apply to binding fetches.
    const rscResponse = withMutableHeaders(response)
    rscResponse.headers.set('content-type', 'text/x-component;charset=utf-8')
    return rscResponse
  })
}

type HeadersCacheOptions = {
  /**
   * Override which requests are cacheable.
   * Defaults to only GET requests with 200 status responses.
   */
  shouldCache?: (request: Request, response: Response) => boolean

  /**
   * Build a cache key from the request. Defaults to the full URL.
   * Must return an absolute URL string or a Request object.
   */
  cacheKey?: (request: Request) => string | Request
}

/**
 * Header-driven edge cache middleware for Cloudflare Workers.
 *
 * @deprecated Use native Workers Cache instead. Add `"cache": { "enabled": true }`
 * to your `wrangler.jsonc` and set `Cache-Control` headers on your responses.
 * Cloudflare's tiered cache sits in front of your Worker and serves hits
 * without running Worker code at all. No middleware needed.
 * See https://developers.cloudflare.com/workers/cache/
 *
 * This middleware still works for advanced cases (custom cache keys, custom
 * shouldCache predicates) but for most apps the native Workers Cache is
 * simpler and faster (zero Worker CPU on cache hits).
 *
 * @example
 * ```ts
 * import { Spiceflow } from 'spiceflow'
 * import { headersCache } from 'spiceflow/cloudflare'
 *
 * const app = new Spiceflow()
 *   .use(headersCache())
 *   .route({
 *     method: 'GET',
 *     path: '/api/data',
 *     handler() {
 *       return new Response(JSON.stringify({ ok: true }), {
 *         headers: {
 *           'Content-Type': 'application/json',
 *           'Cache-Control': 's-maxage=600, max-age=60',
 *         },
 *       })
 *     },
 *   })
 * ```
 */
export const headersCache = (
  options?: HeadersCacheOptions,
): MiddlewareHandler => {
  const {
    shouldCache: customShouldCache,
    cacheKey: customCacheKey,
  } = options ?? {}

  return async function headersCache(context, next) {
    const { request, waitUntil } = context

    // Only cache GET/HEAD by default
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next()
    }

    const cache = caches.default
    const cacheRequest = buildCacheRequest(
      request,
      customCacheKey?.(request) ?? request.url,
    )

    // Check cache — serve HIT for both GET and HEAD
    const cached = await cache.match(cacheRequest)
    if (cached) {
      // For HEAD, strip the body from the cached GET response
      const body = request.method === 'HEAD' ? null : cached.body
      const response = new Response(body, cached)
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Never populate cache from HEAD misses — only GET responses are stored
    if (request.method === 'HEAD') {
      const response = await next()
      if (response) response.headers.set('X-Cache', 'BYPASS')
      return response
    }

    // Cache miss — run the handler
    const response = await next()
    if (!response) return response

    // Determine if we should cache this response
    const shouldStore = customShouldCache
      ? customShouldCache(request, response)
      : response.status === 200 && isCacheable(response)

    if (!shouldStore) {
      response.headers.set('X-Cache', 'BYPASS')
      return response
    }

    // Clone before consuming the body for cache storage
    const responseToCache = response.clone()

    response.headers.set('X-Cache', 'MISS')

    // Store in cache in the background. Catch to avoid noisy unhandled
    // rejections from non-cacheable responses (206, Vary: *, etc.)
    waitUntil(cache.put(cacheRequest, responseToCache).catch(() => {}))

    return response
  }
}

/**
 * Build a GET Request to use as the cache key. Always forces method to GET
 * so HEAD requests don't create separate cache entries.
 */
function buildCacheRequest(
  request: Request,
  key: string | Request,
): Request {
  if (key instanceof Request) {
    return new Request(key.url, { method: 'GET' })
  }

  // Resolve relative URLs against the request origin
  const url = new URL(key, request.url).toString()
  return new Request(url, { method: 'GET' })
}

/**
 * Check if a response's Cache-Control header indicates it should be cached
 * at the edge. Returns true if `s-maxage` is set to a positive integer, or
 * if `public` + `max-age` (positive integer) are set.
 */
function isCacheable(response: Response): boolean {
  const cc = response.headers.get('Cache-Control')
  if (!cc) return false

  // Never cache private, no-store, or no-cache responses
  if (/\b(private|no-store|no-cache)\b/i.test(cc)) return false

  // s-maxage is the explicit edge cache directive
  const sMaxAge = cc.match(/\bs-maxage\s*=\s*(\d+)/i)
  if (sMaxAge && Number(sMaxAge[1]) > 0) return true

  // public + max-age is also cacheable at the edge
  const maxAge = cc.match(/\bmax-age\s*=\s*(\d+)/i)
  if (/\bpublic\b/i.test(cc) && maxAge && Number(maxAge[1]) > 0) return true

  return false
}

