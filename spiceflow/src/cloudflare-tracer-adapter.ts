// Pure adapter logic for wrapping a Cloudflare-style enterSpan function into
// a SpiceflowTracer. Separated from the cloudflare:workers import so the
// wrapping logic can be tested in Node without the workerd runtime.
import type { SpiceflowTracer, SpiceflowSpan } from './instrumentation.js'

interface CfSpanLike {
  setAttribute(key: string, value: string | number | boolean | undefined): void
}

type EnterSpanFn = <T>(
  name: string,
  callback: (span: CfSpanLike) => T,
) => T

function wrapCfSpan(cfSpan: CfSpanLike): SpiceflowSpan {
  return {
    setAttribute(key, value) {
      cfSpan.setAttribute(key, value)
      return this
    },
    setStatus() {
      return this
    },
    recordException() {},
    updateName() {
      return this
    },
    spanContext() {
      return undefined
    },
    end() {},
  }
}

export function createCloudflareTracer(enterSpan: EnterSpanFn): SpiceflowTracer {
  return {
    startActiveSpan(name: string, ...args: any[]) {
      const fn = args[args.length - 1]
      const options =
        args.length >= 2 && typeof args[0] !== 'function' ? args[0] : undefined
      return enterSpan(name, (cfSpan) => {
        if (options?.attributes) {
          for (const [k, v] of Object.entries(options.attributes)) {
            if (v !== undefined) cfSpan.setAttribute(k, v as any)
          }
        }
        return fn(wrapCfSpan(cfSpan))
      })
    },
  }
}
