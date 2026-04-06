# Tracing (OpenTelemetry)

Spiceflow has built-in OpenTelemetry tracing. Pass a `tracer` to the constructor and every request gets automatic spans for middleware, handlers, loaders, layouts, pages, and RSC serialization — no monkey-patching, no plugins.

## Setup

Install the OTel SDK packages alongside spiceflow:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/api
```

Create a tracing setup file that runs **before** your app starts. This registers the OTel SDK globally so spans are collected and exported:

```ts
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  serviceName: 'my-app',
  traceExporter: new OTLPTraceExporter({
    // Send traces to your collector or observability backend
    url: 'http://localhost:4318/v1/traces',
  }),
})

sdk.start()
```

Then pass a tracer to your Spiceflow app:

```ts
// main.ts
import './tracing' // must be imported first
import { trace } from '@opentelemetry/api'
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow({ tracer: trace.getTracer('my-app') }).get(
  '/api/users/:id',
  ({ params }) => {
    return { id: params.id, name: 'Alice' }
  },
)
```

## What you get

Every request produces a span tree. For API routes:

```
GET /api/users/:id [server]
├── middleware - cors
├── middleware - auth
└── handler - /api/users/:id
```

For React routes with loaders and layouts:

```
GET /dashboard [server]
├── middleware - auth
├── loader - /dashboard
├── loader - /sidebar
├── layout - /
├── page - /dashboard
└── rsc.serialize
```

Each span includes standard HTTP attributes (`http.request.method`, `http.route`, `http.response.status_code`, `url.full`) following [OTel semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/). Errors are recorded with `recordException` and set the span status to ERROR. If your errors use [errore](https://errore.org) tagged errors, the stable fingerprint is propagated as an `error.fingerprint` attribute for consistent error grouping.

## Custom spans and attributes

Every handler receives `span` and `tracer` on its context. These work whether or not you configured a tracer — when no tracer is passed, they use no-op implementations that do nothing, so you never need conditional checks.

**Add attributes to the current span:**

```ts
.get('/api/users/:id', ({ params, span }) => {
  const user = db.findUser(params.id)
  span.setAttribute('user.plan', user.plan)
  return user
})
```

**Record a caught exception without re-throwing:**

```ts
.post('/api/webhook', async ({ request, span }) => {
  const body = await request.json()
  try {
    await processWebhook(body)
  } catch (err) {
    span.recordException(err)
  }
  return { ok: true }
})
```

**Create child spans for DB calls or external APIs:**

```ts
.get('/api/data', async ({ tracer, params }) => {
  return tracer.startActiveSpan('db.query', async (dbSpan) => {
    const data = await db.query(params.id)
    dbSpan.setAttribute('db.rows', data.length)
    dbSpan.end()
    return data
  })
})
```

You can also import `withSpan` as a convenience wrapper that handles errors and `span.end()` automatically:

```ts
import { withSpan } from 'spiceflow'

.get('/api/data', async ({ tracer, params }) => {
  return withSpan(tracer, 'db.query', {}, async (dbSpan) => {
    dbSpan.setAttribute('db.table', 'users')
    return db.query(params.id)
  })
})
```

## Zero overhead without tracer

When no `tracer` is passed, every instrumentation point is skipped entirely — no strings allocated, no objects created, no extra async wrappers. The `span` and `tracer` on the handler context use no-op implementations whose empty methods V8 inlines away.
