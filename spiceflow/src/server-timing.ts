// Request-scoped Server-Timing helpers for spiceflow tracing.
// Wraps the user tracer so the same spans can flow to OpenTelemetry and
// also be exposed as a Server-Timing response header for browser debugging.

import { routerContextStorage } from './router-context.js'
import type { SpiceflowSpan, SpiceflowTracer } from './instrumentation.js'

type ServerTimingMetric = {
  name: string
  parent?: ServerTimingMetric
  startedAt: number
  duration?: number
  order: number
}

type SpiceflowSpanOptions = {
  kind?: number
  attributes?: Record<string, string | number | boolean | undefined>
}

function now() {
  return globalThis.performance?.now() ?? Date.now()
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (!value) return false
  if (typeof value !== 'object' && typeof value !== 'function') return false

  return typeof Reflect.get(value, 'then') === 'function'
}

function isServerTimingStack(value: unknown): value is ServerTimingMetric[] {
  return Array.isArray(value)
}

function sanitizeServerTimingName(value: string) {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9!#$%&'*+.^_`|~-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized || 'span'
}

function getServerTimingDescription(metric: ServerTimingMetric) {
  const names: string[] = []
  let current: ServerTimingMetric | undefined = metric

  while (current) {
    names.unshift(current.name)
    current = current.parent
  }

  if (names.length > 1) {
    names.shift()
  }

  return names.join(' > ')
}

function runWithServerTimingMetric<T>(
  metric: ServerTimingMetric,
  fallbackStack: ServerTimingMetric[],
  fn: () => Promise<T>,
): Promise<T>
function runWithServerTimingMetric<T>(
  metric: ServerTimingMetric,
  fallbackStack: ServerTimingMetric[],
  fn: () => T,
): T
function runWithServerTimingMetric<T>(
  metric: ServerTimingMetric,
  fallbackStack: ServerTimingMetric[],
  fn: () => T | Promise<T>,
): T | Promise<T> {
  const store = routerContextStorage.getStore()
  const serverTimingStack = isServerTimingStack(store?.serverTimingStack)
    ? store.serverTimingStack
    : []

  if (store) {
    return routerContextStorage.run(
      {
        ...store,
        serverTimingStack: [...serverTimingStack, metric],
      },
      fn,
    )
  }

  fallbackStack.push(metric)

  try {
    const result = fn()
    if (!isPromiseLike(result)) {
      fallbackStack.pop()
      return result
    }

    return Promise.resolve(result).finally(() => {
      fallbackStack.pop()
    })
  } catch (error) {
    fallbackStack.pop()
    throw error
  }
}

export function appendServerTimingHeader(
  response: Response,
  value: string | undefined,
) {
  if (!value) return response

  const headers = new Headers(response.headers)
  headers.append('server-timing', value)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function createRequestTracing({
  tracer,
  serverTiming,
}: {
  tracer?: SpiceflowTracer
  serverTiming?: boolean
}) {
  if (!tracer || !serverTiming) {
    return {
      tracer,
      getServerTimingHeader() {
        return undefined
      },
    }
  }

  const metrics: ServerTimingMetric[] = []
  const fallbackStack: ServerTimingMetric[] = []
  let nextOrder = 0
  const baseTracer = tracer

  function startActiveSpan<F extends (span: SpiceflowSpan) => unknown>(
    name: string,
    fn: F,
  ): ReturnType<F>
  function startActiveSpan<F extends (span: SpiceflowSpan) => unknown>(
    name: string,
    options: SpiceflowSpanOptions,
    fn: F,
  ): ReturnType<F>
  function startActiveSpan<F extends (span: SpiceflowSpan) => unknown>(
    name: string,
    optionsOrFn: SpiceflowSpanOptions | F,
    maybeFn?: F,
  ) {
    const store = routerContextStorage.getStore()
    const serverTimingStack = isServerTimingStack(store?.serverTimingStack)
      ? store.serverTimingStack
      : fallbackStack
    const parent = serverTimingStack.at(-1)
    const metric: ServerTimingMetric = {
      name,
      parent,
      startedAt: now(),
      order: nextOrder++,
    }

    const createCallback = (fn: F) => (span: SpiceflowSpan) => {
      let ended = false
      const wrappedSpan: SpiceflowSpan = {
        setAttribute(key, value) {
          span.setAttribute(key, value)
          return wrappedSpan
        },
        setStatus(status) {
          span.setStatus(status)
          return wrappedSpan
        },
        recordException(exception) {
          span.recordException(exception)
        },
        updateName(nextName) {
          metric.name = nextName
          span.updateName(nextName)
          return wrappedSpan
        },
        spanContext() {
          return span.spanContext?.()
        },
        end(endTime) {
          if (ended) return
          ended = true
          metric.duration = now() - metric.startedAt
          metrics.push(metric)
          span.end(endTime)
        },
      }

      return runWithServerTimingMetric(metric, fallbackStack, () =>
        fn(wrappedSpan),
      )
    }

    if (typeof optionsOrFn === 'function') {
      return baseTracer.startActiveSpan(name, createCallback(optionsOrFn))
    }

    if (!maybeFn) {
      throw new Error('Missing span callback')
    }

    return baseTracer.startActiveSpan(name, optionsOrFn, createCallback(maybeFn))
  }

  const wrappedTracer: SpiceflowTracer = { startActiveSpan }

  return {
    tracer: wrappedTracer,
    getServerTimingHeader() {
      if (metrics.length === 0) return undefined

      const counts = new Map<string, number>()
      return [...metrics]
        .sort((a, b) => a.order - b.order)
        .map((metric) => {
          const description = getServerTimingDescription(metric)
          const baseName = sanitizeServerTimingName(description)
          const count = (counts.get(baseName) ?? 0) + 1
          counts.set(baseName, count)
          const name = count === 1 ? baseName : `${baseName}.${count}`
          const duration = Number(metric.duration?.toFixed(3) ?? '0')
          const escapedDescription = description
            .replaceAll('\\', '\\\\')
            .replaceAll('"', '\\"')

          return `${name};dur=${duration};desc="${escapedDescription}"`
        })
        .join(', ')
    },
  }
}
