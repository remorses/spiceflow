// Default waitUntil for Node.js and Bun. Checks for Vercel's request context
// first (globalThis[Symbol.for('@vercel/request-context')]), then falls back
// to local tracking. On Cloudflare the workerd condition resolves to the real
// cloudflare:workers waitUntil instead.
const VERCEL_CONTEXT = Symbol.for('@vercel/request-context')
const pending = new Set<Promise<any>>()

function getVercelWaitUntil(): ((p: Promise<any>) => void) | undefined {
  const store = (globalThis as any)[VERCEL_CONTEXT]
  return store?.get?.()?.waitUntil
}

export const defaultWaitUntil: (promise: Promise<any>) => void = (promise) => {
  const vercelWaitUntil = getVercelWaitUntil()
  if (vercelWaitUntil) {
    return vercelWaitUntil(promise)
  }
  pending.add(promise)
  promise.catch(() => {}).finally(() => pending.delete(promise))
}

export function pendingWaitUntilCount(): number {
  return pending.size
}
