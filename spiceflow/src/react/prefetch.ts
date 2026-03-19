// Prefetch cache for RSC payloads. Link triggers prefetchRoute() on hover,
// the navigation handler in entry.client.tsx consumes cached responses via consumePrefetch().
'use client'

const PREFETCH_TTL = 5_000

type PrefetchEntry = {
  promise: Promise<Response>
  timestamp: number
}

const cache = new Map<string, PrefetchEntry>()

export function prefetchRoute(href: string) {
  if (typeof window === 'undefined') return

  let url: URL
  try {
    url = new URL(href, window.location.origin)
  } catch {
    return
  }
  if (url.origin !== window.location.origin) return

  url.searchParams.set('__rsc', '')
  const key = url.pathname + url.search

  if (cache.has(key)) return

  const promise = fetch(url.toString()).catch(() => {
    cache.delete(key)
    return new Response(null, { status: 0 })
  })

  cache.set(key, { promise, timestamp: Date.now() })
}

export function consumePrefetch(
  pathname: string,
  search: string,
): Promise<Response> | null {
  const key = pathname + search
  const entry = cache.get(key)
  if (!entry) return null
  cache.delete(key)
  if (Date.now() - entry.timestamp > PREFETCH_TTL) return null
  return entry.promise
}
