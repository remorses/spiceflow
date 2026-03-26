// OTel-compatible interfaces and span helpers for spiceflow instrumentation.
// No runtime dependency on @opentelemetry/api — these interfaces are structurally
// compatible with the OTel API so users pass their own tracer:
//   import { trace } from '@opentelemetry/api'
//   new Spiceflow({ tracer: trace.getTracer('my-app') })

// Matches @opentelemetry/api Span interface (subset we use)
export interface SpiceflowSpan {
  setAttribute(key: string, value: string | number | boolean): this
  setStatus(status: { code: number; message?: string }): this
  recordException(exception: Error | string): void
  updateName(name: string): this
  end(endTime?: unknown): void
}

// Matches @opentelemetry/api Tracer interface (subset we use)
export interface SpiceflowTracer {
  startActiveSpan<F extends (span: SpiceflowSpan) => unknown>(
    name: string,
    fn: F,
  ): ReturnType<F>
  startActiveSpan<F extends (span: SpiceflowSpan) => unknown>(
    name: string,
    options: SpanOptions,
    fn: F,
  ): ReturnType<F>
}

interface SpanOptions {
  kind?: number
  attributes?: Record<string, string | number | boolean | undefined>
}

// OTel SpanKind.SERVER = 1
export const SPAN_KIND_SERVER = 1

// OTel SpanStatusCode values
const STATUS_ERROR = 2

// No-op implementations so context.span and context.tracer are always available
// without undefined checks. V8 inlines these empty methods away.
export const noopSpan: SpiceflowSpan = {
  setAttribute() {
    return this
  },
  setStatus() {
    return this
  },
  recordException() {},
  updateName() {
    return this
  },
  end() {},
}

export const noopTracer: SpiceflowTracer = {
  startActiveSpan(name: string, ...args: any[]) {
    const fn = args[args.length - 1]
    return fn(noopSpan)
  },
}

// Semantic convention attribute keys (string literals to avoid importing @opentelemetry/semantic-conventions)
export const ATTR = {
  HTTP_REQUEST_METHOD: 'http.request.method',
  HTTP_RESPONSE_STATUS_CODE: 'http.response.status_code',
  HTTP_ROUTE: 'http.route',
  URL_FULL: 'url.full',
  URL_PATH: 'url.path',
  ERROR_TYPE: 'error.type',
  ERROR_FINGERPRINT: 'error.fingerprint',
} as const

// Run an async function inside an active span. No-op when tracer is undefined.
// Child spans created inside `fn` are automatically parented to this span.
export async function withSpan<T>(
  tracer: SpiceflowTracer | undefined,
  name: string,
  options: SpanOptions,
  fn: (span?: SpiceflowSpan) => Promise<T>,
): Promise<T> {
  if (!tracer) return fn()
  return tracer.startActiveSpan(name, options, async (span): Promise<T> => {
    try {
      return await fn(span)
    } catch (error) {
      // Response throws are control flow in spiceflow (redirect/notFound), not errors
      if (!(error instanceof Response)) {
        recordError(span, error)
      }
      throw error
    } finally {
      span.end()
    }
  }) as Promise<T>
}

// Record an error on a span: sets status to ERROR, records the exception event,
// and propagates errore fingerprint if available.
export function recordError(span: SpiceflowSpan, error: unknown): void {
  if (error instanceof Error) {
    span.setAttribute(ATTR.ERROR_TYPE, error.name)
    span.setStatus({ code: STATUS_ERROR, message: error.message })
    span.recordException(error)

    // Propagate errore tagged error fingerprint for stable error grouping.
    // errore fingerprints are arrays like ['NotFoundError', 'User $id not found in $database']
    // which are stable across deploys and variable values.
    const fingerprint = (error as any).fingerprint
    if (Array.isArray(fingerprint)) {
      span.setAttribute(ATTR.ERROR_FINGERPRINT, fingerprint.join('\n'))
    }
    return
  }
  // Handle non-Error throws (strings, objects, etc.)
  span.setStatus({ code: STATUS_ERROR, message: String(error) })
  span.recordException(String(error))
}

// Finalize the root request span with response attributes.
export function finalizeRequestSpan(
  span: SpiceflowSpan | undefined,
  response: Response,
  route?: string,
): void {
  if (!span) return
  span.setAttribute(ATTR.HTTP_RESPONSE_STATUS_CODE, response.status)
  if (route) span.setAttribute(ATTR.HTTP_ROUTE, route)
  if (response.status >= 500) {
    span.setStatus({ code: STATUS_ERROR })
  }
}
