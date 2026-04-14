import { getBasePath } from '../base-path.js'

export interface ReactServerErrorContext {
  status: number
  headers?: Record<string, string> | [string, string][]
}

// Normalizes headers from either Record or entries array into a plain
// object. Used when reading headers from decoded digest contexts where
// we only need single-value access (e.g. checking the location header).
export function contextHeaders(
  ctx: ReactServerErrorContext,
): Record<string, string> {
  if (!ctx.headers) return {}
  if (Array.isArray(ctx.headers)) {
    return Object.fromEntries(ctx.headers)
  }
  return ctx.headers
}

// Normalizes headers from a decoded digest context into a Headers object,
// preserving duplicate keys like set-cookie.
export function contextToHeaders(ctx: ReactServerErrorContext): Headers {
  if (!ctx.headers) return new Headers()
  return new Headers(ctx.headers as HeadersInit)
}

function hasBasePrefix(path: string, base: string): boolean {
  if (path === base) return true
  const next = path.charAt(base.length)
  return path.startsWith(base) && (next === '/' || next === '?' || next === '#')
}

export function redirect(
  location: string,
  options?: { status?: number; headers?: Record<string, string> },
) {
  const base = getBasePath()
  // Auto-prepend base path to absolute redirect targets so user code
  // can write redirect("/dashboard") without worrying about base config.
  if (
    base &&
    location.startsWith('/') &&
    !location.startsWith('//') &&
    !hasBasePrefix(location, base)
  ) {
    location = base + location
  }
  return new Response(null, {
    status: options?.status ?? 307,
    headers: {
      ...options?.headers,
      location,
    },
  })
}

export function notFound() {
  return new Response(null, { status: 404 })
}

export function isRedirectError(ctx?: ReactServerErrorContext) {
  if (!ctx) return false
  const headers = contextHeaders(ctx)
  const location = headers['location']
  if (300 <= ctx.status && ctx.status <= 399 && typeof location === 'string') {
    return { location }
  }
  return false
}

export function isRedirectStatus(status: number) {
  return 300 <= status && status <= 399
}

export function isNotFoundError(ctx?: ReactServerErrorContext) {
  if (!ctx) return false
  return ctx.status === 404
}

// Decodes the digest string from React's flight stream back into a
// ReactServerErrorContext. The RSC onError encodes thrown Responses as
// "__REACT_SERVER_ERROR__:{status,headers}" digest strings, and the SSR
// layer uses this function to recover the original status/headers.
export function getErrorContext(
  error: unknown,
): ReactServerErrorContext | undefined {
  if (error instanceof Response) {
    return {
      status: error.status,
      headers: [...error.headers.entries()],
    }
  }

  if (
    error instanceof Error &&
    'digest' in error &&
    typeof error.digest === 'string'
  ) {
    const m = error.digest.match(/^__REACT_SERVER_ERROR__:(.*)$/)
    if (m && m[1]) {
      try {
        return JSON.parse(m[1])
      } catch (e) {
        console.error(e)
      }
    }
  }
  return
}
