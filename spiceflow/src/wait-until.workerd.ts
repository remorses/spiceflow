// Cloudflare Workers waitUntil. Uses the context-aware waitUntil from
// cloudflare:workers which internally uses AsyncLocalStorage to find the
// current execution context, so it works from anywhere without threading ctx.
import { waitUntil } from 'cloudflare:workers'

export const defaultWaitUntil: (promise: Promise<any>) => void = waitUntil
