// Cloudflare edge cache middleware. Uses the Cache API (caches.default) to
// cache Worker responses based on standard Cache-Control headers (s-maxage).
// Workers run before the CDN cache, so responses are never automatically cached
// — this middleware bridges the gap, letting you control caching with headers.

import { MiddlewareHandler } from './types.js'

// Cloudflare extends the standard CacheStorage with a `default` property
// that gives access to the zone's default edge cache without calling
// caches.open(). This type is not in the standard lib DOM types.
declare global {
  interface CacheStorage {
    default: Cache
  }
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
 * Caches Worker-generated responses at the edge using the Cache API,
 * controlled by standard `Cache-Control` headers on the response.
 *
 * Workers normally run before the CDN cache and their responses are never
 * cached automatically. This middleware reads `s-maxage` (or `max-age` with
 * `public`) from the response headers and stores matching responses in
 * `caches.default`. On cache hits, downstream handlers are skipped — the
 * Worker still executes, but returns the cached response immediately.
 *
 * Set `Vary` on your response to cache different variants per request header
 * (e.g. `Vary: Accept, Accept-Language`). The Cache API respects the `Vary`
 * header on stored responses automatically.
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
      const response = cloneIfImmutable(await next())
      if (response) response.headers.set('X-Cache', 'BYPASS')
      return response
    }

    // Cache miss — run the handler
    const response = await next()
    if (!response) return response

    const mutableResponse = cloneIfImmutable(response)

    // Determine if we should cache this response
    const shouldStore = customShouldCache
      ? customShouldCache(request, mutableResponse)
      : mutableResponse.status === 200 && isCacheable(mutableResponse)

    if (!shouldStore) {
      mutableResponse.headers.set('X-Cache', 'BYPASS')
      return mutableResponse
    }

    // Clone before consuming the body for cache storage
    const responseToCache = mutableResponse.clone()

    mutableResponse.headers.set('X-Cache', 'MISS')

    // Store in cache in the background. Catch to avoid noisy unhandled
    // rejections from non-cacheable responses (206, Vary: *, etc.)
    waitUntil(cache.put(cacheRequest, responseToCache).catch(() => {}))

    return mutableResponse
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

/**
 * If the response headers are immutable (e.g. from a subrequest fetch()),
 * clone into a mutable Response so we can set X-Cache, etc.
 */
function cloneIfImmutable(response: Response): Response {
  try {
    const key = 'x-spiceflow-probe'
    response.headers.set(key, '1')
    response.headers.delete(key)
    return response
  } catch {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    })
  }
}
