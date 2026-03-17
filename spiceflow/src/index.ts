import { SpiceflowRequest, WaitUntil, Method } from './spiceflow.js'
import { serveStatic } from './static-node.js'
import type { MiddlewareHandler } from './types.js'

export { Spiceflow, createSafePath } from './spiceflow.js'
export { redirect, notFound } from './react/errors.js'
export type { AnySpiceflow, WaitUntil } from './spiceflow.js'
export { ValidationError } from './error.js'
export { preventProcessExitIfBusy } from './prevent-process-exit-if-busy.js'

// utility Response to be used in Cloudflare Workers to shut up the TypeScript errors (cloudflare Response is different than normal Response type)
class Response extends globalThis.Response {}

export { Response }
export { SpiceflowRequest }
export type { MiddlewareHandler }
export { serveStatic }
