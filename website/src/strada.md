---
title: Observability with Strada
description: OpenTelemetry backend with error tracking and traces.
icon: activity
---

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

## React error tracking

Spiceflow exposes React 19's root error handlers (`onCaughtError`, `onUncaughtError`, `onRecoverableError`) via `setReactErrorHandlers`. These fire for **every** React render error globally, even when the user has their own `ErrorBoundary`. Call it before React hydrates, typically at the top of your client entry or inside your SDK init.

```ts
import { setReactErrorHandlers } from 'spiceflow/react'
import { captureException } from '@strada.sh/sdk'

setReactErrorHandlers({
  onCaughtError(error, errorInfo) {
    // Fires when any ErrorBoundary catches an error.
    // errorInfo.componentStack is the React component tree.
    captureException(error, {
      tags: { reactHandler: 'onCaughtError' },
      extra: { componentStack: errorInfo.componentStack },
    })
  },
  onUncaughtError(error, errorInfo) {
    // Fires when no ErrorBoundary catches the error.
    // React unmounts the entire tree after this.
    captureException(error, {
      tags: { reactHandler: 'onUncaughtError' },
      extra: { componentStack: errorInfo.componentStack },
    })
  },
  onRecoverableError(error, errorInfo) {
    // Fires on hydration mismatches and other recoverable failures.
    // React re-renders from scratch after this.
    captureException(error, {
      tags: { reactHandler: 'onRecoverableError' },
      extra: { componentStack: errorInfo.componentStack },
    })
  },
})
```

| Handler | When it fires | React behavior after |
|---|---|---|
| `onCaughtError` | Error caught by an `ErrorBoundary` | Fallback UI renders |
| `onUncaughtError` | Error not caught by any boundary | Tree unmounts |
| `onRecoverableError` | Hydration mismatch or auto-recovery | Client re-render |

The handlers are set on `globalThis` and read by Spiceflow's client entry at hydration time. If you call `setReactErrorHandlers` after hydration, the handlers won't take effect. Always call it early, before any React rendering happens.
