// Cloudflare Workers tracing adapter. Wraps the native tracing.enterSpan() API
// from cloudflare:workers into SpiceflowTracer so spiceflow automatically gets
// span trees on Cloudflare without the user passing a tracer.
//
// Uses import * and optional chaining so older wrangler versions that don't
// export tracing from cloudflare:workers don't crash at import time.
import * as cfWorkers from 'cloudflare:workers'
import { createCloudflareTracer } from './cloudflare-tracer-adapter.js'

const tracing = (cfWorkers as any).tracing
export const cloudflareTracer = tracing?.enterSpan
  ? createCloudflareTracer(tracing.enterSpan.bind(tracing))
  : undefined
