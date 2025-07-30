import { Spiceflow } from './spiceflow.js'
import type { AnySpiceflow } from './spiceflow.js'

interface GracefulShutdownOptions {
  maxWaitSeconds?: number
  checkIntervalMs?: number
}

/**
 * Creates a Spiceflow middleware that tracks in-flight requests and prevents
 * the process from exiting while requests are being processed.
 *
 * @param options - Configuration options
 * @param options.maxWaitSeconds - Maximum time to wait for requests to complete (default: 300)
 * @param options.checkIntervalMs - Interval to check if requests are complete (default: 250)
 * @returns Spiceflow app that can be mounted with .use()
 */
export function preventProcessExitIfBusy(
  options: GracefulShutdownOptions = {},
): any {
  const { maxWaitSeconds = 300, checkIntervalMs = 250 } = options

  // Track in-flight requests in closure
  let inFlightRequests = 0
  let isShuttingDown = false

  // Sleep utility
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

  // Graceful shutdown handler
  async function handleShutdown(signal: NodeJS.Signals) {
    if (isShuttingDown) return // Prevent multiple shutdown attempts
    isShuttingDown = true

    console.log(
      `${signal} received – waiting for ${inFlightRequests} request(s) to complete...`,
    )

    const deadline = Date.now() + maxWaitSeconds * 1000

    while (inFlightRequests > 0 && Date.now() < deadline) {
      await sleep(checkIntervalMs)
    }

    if (inFlightRequests > 0) {
      console.log(
        `Shutdown timeout reached; ${inFlightRequests} request(s) still in progress`,
      )
    } else {
      console.log('All requests completed')
    }

    process.exit(inFlightRequests > 0 ? 1 : 0)
  }

  // Register shutdown handlers only in Node.js environments
  if (typeof process !== 'undefined' && process.prependListener) {
    ;['SIGINT', 'SIGTERM'].forEach((sig) => {
      process.prependListener(sig as NodeJS.Signals, handleShutdown)
    })
  }

  // Return Spiceflow middleware with scoped: false
  return new Spiceflow({ scoped: false }).use(async (_, next) => {
    inFlightRequests++
    try {
      await next()
    } finally {
      inFlightRequests--
    }
  })
}
