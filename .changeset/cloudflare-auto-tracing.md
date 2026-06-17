---
'spiceflow': patch
---

Automatically use Cloudflare Workers native tracing when no `tracer` is passed. On Cloudflare, spiceflow now detects the runtime and wraps `tracing.enterSpan()` from `cloudflare:workers` into the standard `SpiceflowTracer` interface. All span trees (middleware, handlers, loaders, layouts, pages, RSC serialization) appear in the Cloudflare dashboard alongside automatic platform spans (KV, D1, fetch) with zero configuration beyond enabling `observability.traces.enabled` in `wrangler.jsonc`. If an explicit `tracer` is passed to the constructor, it takes priority.
