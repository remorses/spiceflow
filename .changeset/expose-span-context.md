---
'spiceflow': patch
---

Expose `span.spanContext?.()` on Spiceflow tracing spans so handlers and middleware can read the current `traceId` and `spanId` when the configured tracer provides them.
