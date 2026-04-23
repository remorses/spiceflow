// Default waitUntil for Node.js and Bun. Tracks pending promises so the
// graceful shutdown handler can wait for background work to finish before
// exiting. On Cloudflare the workerd condition resolves to the real
// cloudflare:workers waitUntil instead and tracking is unnecessary.
const pending = new Set<Promise<any>>()

export const defaultWaitUntil: (promise: Promise<any>) => void = (promise) => {
  pending.add(promise)
  promise.catch(() => {}).finally(() => pending.delete(promise))
}

export function pendingWaitUntilCount(): number {
  return pending.size
}
