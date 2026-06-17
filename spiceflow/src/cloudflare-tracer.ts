// Default fallback for non-Cloudflare environments. Returns undefined so
// the Spiceflow constructor treats it as "no tracer" and skips instrumentation.
import type { SpiceflowTracer } from './instrumentation.js'

export const cloudflareTracer: SpiceflowTracer | undefined = undefined
