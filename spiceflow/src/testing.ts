// Public test utilities for vitest. Import from 'spiceflow/testing'.
// SpiceflowTestResponse is returned by app.handle() for page routes when
// the spiceflow-vitest condition is active. runAction wraps server action
// calls with request context so getActionRequest() works in tests.
// createTestTracer returns a tracer that records spans and renders them
// as an ASCII tree via .text() for inline snapshots.
export { SpiceflowTestResponse } from './spiceflow.js'
export { runAction } from './action-context.js'

import type { SpiceflowTracer, SpiceflowSpan } from './instrumentation.js'

interface TestSpan {
  name: string
  attributes: Record<string, string | number | boolean>
  status?: { code: number; message?: string }
  ended: boolean
  children: TestSpan[]
  parent?: TestSpan
}

/**
 * Test tracer that records spans and renders them as an ASCII tree.
 * Pass it to `new Spiceflow({ tracer })` and call `tracer.text()` after
 * `app.handle()` to snapshot the span tree.
 *
 * ```ts
 * const tracer = createTestTracer()
 * const app = new Spiceflow({ tracer }).get('/hello', () => 'world')
 * await app.handle(new Request('http://localhost/hello'))
 * expect(tracer.text()).toMatchInlineSnapshot(`
 *   GET /hello (200)
 *   └── handler - /hello
 * `)
 * ```
 */
export function createTestTracer(): SpiceflowTracer & {
  spans: TestSpan[]
  text(): string
  clear(): void
} {
  const spans: TestSpan[] = []
  const stack: TestSpan[] = []
  let nextId = 0

  function renderTree(span: TestSpan, prefix: string, isLast: boolean, isRoot: boolean): string {
    const connector = isRoot ? '' : isLast ? '└── ' : '├── '
    const status = span.attributes['http.response.status_code']
    const suffix = status != null ? ` (${status})` : ''
    let line = `${prefix}${connector}${span.name}${suffix}`
    const childPrefix = isRoot ? prefix : prefix + (isLast ? '    ' : '│   ')
    for (let i = 0; i < span.children.length; i++) {
      line += '\n' + renderTree(span.children[i]!, childPrefix, i === span.children.length - 1, false)
    }
    return line
  }

  const tracer: SpiceflowTracer & { spans: TestSpan[]; text(): string; clear(): void } = {
    spans,
    text() {
      const roots = spans.filter((s) => !s.parent)
      return roots.map((r) => renderTree(r, '', true, true)).join('\n')
    },
    clear() {
      spans.length = 0
      stack.length = 0
    },
    startActiveSpan(name: string, ...args: any[]) {
      const fn = args[args.length - 1] as (span: SpiceflowSpan) => unknown
      const options = args.length > 1 ? args[0] : {}
      const parent = stack[stack.length - 1]
      const testSpan: TestSpan = {
        name,
        attributes: { ...options.attributes },
        ended: false,
        children: [],
        parent,
      }
      if (parent) parent.children.push(testSpan)
      spans.push(testSpan)
      stack.push(testSpan)

      const span: SpiceflowSpan = {
        setAttribute(key, value) { testSpan.attributes[key] = value; return span },
        setStatus(s) { testSpan.status = s; return span },
        recordException() {},
        updateName(n) { testSpan.name = n; return span },
        spanContext() { return { traceId: String(nextId), spanId: String(++nextId) } },
        end() {
          testSpan.ended = true
          const idx = stack.lastIndexOf(testSpan)
          if (idx !== -1) stack.splice(idx, 1)
        },
      }
      return fn(span)
    },
  }

  return tracer
}
