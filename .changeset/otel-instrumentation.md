---
'spiceflow': minor
---

Add built-in OpenTelemetry tracing instrumentation. Pass a `tracer` option to the Spiceflow constructor to get automatic spans for every request, middleware, handler, loader, layout, page, and RSC serialize step — no monkey-patching required. The tracer interface is structurally compatible with `@opentelemetry/api` so there's zero runtime dependency on it; just pass your own tracer instance. Errors recorded on spans include the errore fingerprint when available for stable error grouping.

```ts
import { trace } from '@opentelemetry/api'

const app = new Spiceflow({
  tracer: trace.getTracer('my-app'),
})
```
