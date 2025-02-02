import { MiddlewareHandler } from './types.js'
/**
 * Options for configuring CORS (Cross-Origin Resource Sharing) middleware.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS MDN CORS documentation}
 */
type CORSOptions = {
  /** Configures the Access-Control-Allow-Origin CORS header */
  origin: string | string[]
  /** Configures the Access-Control-Allow-Methods CORS header */
  allowMethods?: string[]
  /** Configures the Access-Control-Allow-Headers CORS header */
  allowHeaders?: string[]
  /** Configures the Access-Control-Max-Age CORS header */
  maxAge?: number
  /** Configures the Access-Control-Allow-Credentials CORS header */
  credentials?: boolean
  /** Configures the Access-Control-Expose-Headers CORS header */
  exposeHeaders?: string[]
  /** Configures browser and CDN caching duration for CORS preflight requests in seconds. Set to 0 to disable. */
  cacheAge?: number
}

export const cors = (options?: CORSOptions): MiddlewareHandler => {
  const defaults: CORSOptions = {
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
    allowHeaders: [],
    exposeHeaders: [],
    credentials: true,
    cacheAge: 21600, // 6 hours default
  }
  const opts = {
    ...defaults,
    ...options,
  }

  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === 'string') {
      return () => optsOrigin
    } else if (typeof optsOrigin === 'function') {
      return optsOrigin
    } else {
      return (origin: string) =>
        optsOrigin.includes(origin) ? origin : optsOrigin[0]
    }
  })(opts.origin)

  return async function cors(c, next) {
    let response = await next()

    function set(key: string, value: string) {
      try {
        response.headers.set(key, value)
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('immutable')) {
          response = new Response(response.body, response)
          set(key, value)
        } else {
          throw error
        }
      }
    }

    const allowOrigin = findAllowOrigin(c.request.headers.get('origin') || '')
    if (allowOrigin) {
      set('Access-Control-Allow-Origin', allowOrigin)
    }

    // Suppose the server sends a response with an Access-Control-Allow-Origin value with an explicit origin (rather than the "*" wildcard).
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    if (opts.origin !== '*') {
      const existingVary = c.request.headers.get('Vary')

      if (existingVary) {
        set('Vary', existingVary)
      } else {
        set('Vary', 'Origin')
      }
    }

    if (opts.credentials) {
      set('Access-Control-Allow-Credentials', 'true')
    }

    if (opts.exposeHeaders?.length) {
      set('Access-Control-Expose-Headers', opts.exposeHeaders.join(','))
    }

    if (c.request.method === 'OPTIONS') {
      // Set CORS caching headers if enabled
      if (opts.cacheAge && opts.cacheAge > 0) {
        // CORS preflight cache
        set('Access-Control-Max-Age', opts.cacheAge.toString())

        // Browser cache and CDN cache
        set(
          'Cache-Control',
          `public, max-age=${opts.cacheAge}, s-maxage=${opts.cacheAge}`,
        )

        // Additional CDN-specific headers
        set('CDN-Cache-Control', `public, s-maxage=${opts.cacheAge}`)
        set('Cloudflare-CDN-Cache-Control', `public, s-maxage=${opts.cacheAge}`)
      }

      if (opts.allowMethods?.length) {
        set('Access-Control-Allow-Methods', opts.allowMethods.join(','))
      }

      let headers = opts.allowHeaders
      if (!headers?.length) {
        const requestHeaders = c.request.headers.get(
          'Access-Control-Request-Headers',
        )
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/)
        }
      }
      if (headers?.length) {
        set('Access-Control-Allow-Headers', headers.join(','))
        c.request.headers.append('Vary', 'Access-Control-Request-Headers')
      }

      response.headers.delete('Content-Length')
      response.headers.delete('Content-Type')

      return new Response(null, {
        headers: response.headers,
        status: 204,
        statusText: response.statusText,
      })
    }
    return response
  }
}
