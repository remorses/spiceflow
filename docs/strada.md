# Observability with Strada

[Strada](https://strada.sh) is an OpenTelemetry backend with error tracking, logs, traces, metrics, analytics, and a SQL CLI. Use `@strada.sh/sdk` to configure OTel once, pass its tracer to Spiceflow, then use the same SDK for logs and handled exceptions.

Create a project first, or list existing projects to find the project ID:

```bash
strada database create
strada projects create my-api

# Later, find the project ID and ingest endpoint again
strada projects list
```

Install Strada in your Spiceflow app:

```bash
npm install @strada.sh/sdk
```

Then initialize Strada before creating the Spiceflow app:

```ts
import { Spiceflow } from 'spiceflow'
import {
  SpanStatusCode,
  captureException,
  getLogger,
  initStrada,
  trace,
} from '@strada.sh/sdk'

initStrada({
  projectId: process.env.STRADA_PROJECT_ID!,
  service: 'api',
  environment: process.env.NODE_ENV ?? 'development',
  enabled: !import.meta.hot,
})

// enabled: false keeps OTel APIs local but sends nothing to ingest.
// In Vite/RSC dev servers, import.meta.hot is truthy during HMR.

const tracer = trace.getTracer('api')
const logger = getLogger('api')

export const app = new Spiceflow({ tracer, serverTiming: true })
  .get('/api/users/:id', async ({ params, span, tracer }) => {
    span.setAttribute('user.id', params.id)
    logger.info({ message: 'loading user', userId: params.id })

    return tracer.startActiveSpan('db.find-user', async (dbSpan) => {
      try {
        dbSpan.setAttribute('db.operation', 'SELECT')
        return { id: params.id, name: 'Alice' }
      } finally {
        dbSpan.end()
      }
    })
  })
  .onError(({ error, path, span }) => {
    captureException(error, { tags: { path } })
    span.recordException(error)
    span.setStatus({ code: SpanStatusCode.ERROR })

    logger.error({
      message: 'request failed',
      path,
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response('An error occurred', { status: 500 })
  })
```

The Spiceflow request spans, custom child spans, logs, and `captureException()` calls all flow to the same Strada project. Use the CLI to inspect them:

```bash
strada issues list -p my-api --since 24h
strada logs -p my-api --since 1h
strada query "SELECT count() FROM otel_traces" -p my-api
```
