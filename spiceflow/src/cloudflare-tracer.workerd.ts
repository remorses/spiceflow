// Cloudflare Workers tracing adapter. Wraps the native tracing.enterSpan() API
// from cloudflare:workers into SpiceflowTracer so spiceflow automatically gets
// span trees on Cloudflare without the user passing a tracer.
//
// The CF Span only supports setAttribute() and isTraced. Methods the CF API
// doesn't support yet (setStatus, recordException, updateName, spanContext, end)
// are filled with no-ops. CF auto-ends spans when the enterSpan callback returns.
import { tracing } from 'cloudflare:workers'
import { createCloudflareTracer } from './cloudflare-tracer-adapter.js'

export const cloudflareTracer = createCloudflareTracer(tracing.enterSpan)
