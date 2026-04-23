// Default waitUntil for Node.js and Bun. Runs the promise in the background
// and catches rejections so they don't crash the process with an unhandled
// rejection. In long-lived servers this is fine; on serverless platforms
// the workerd condition resolves to the real Cloudflare waitUntil instead.
export const defaultWaitUntil: (promise: Promise<any>) => void = (promise) => {
  promise.catch(() => {})
}
