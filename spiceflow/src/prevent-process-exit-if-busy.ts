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

    const startTime = Date.now()
    console.log(
      `[${new Date().toISOString()}] ${signal} signal received for graceful shutdown`,
    )
    console.log(
      `[${new Date().toISOString()}] Waiting for ${inFlightRequests} in-flight request(s) to complete...`,
    )

    const deadline = Date.now() + maxWaitSeconds * 1000

    while (inFlightRequests > 0 && Date.now() < deadline) {
      await sleep(checkIntervalMs)
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)

    if (inFlightRequests > 0) {
      console.log(
        `[${new Date().toISOString()}] Shutdown timeout reached after ${elapsedSeconds}s; ${inFlightRequests} request(s) still in progress`,
      )
      console.log(
        `[${new Date().toISOString()}] Forcing shutdown with exit code 1`,
      )
    } else {
      console.log(
        `[${new Date().toISOString()}] All requests completed successfully after ${elapsedSeconds}s`,
      )
      console.log(
        `[${new Date().toISOString()}] Graceful shutdown complete`,
      )
    }

    process.exit(inFlightRequests > 0 ? 1 : 0)
  }

  // Register shutdown handlers only in Node.js environments
  if (typeof process !== 'undefined' && process.prependListener) {
    ;['SIGINT', 'SIGTERM'].forEach((sig) => {
      process.prependListener(sig as NodeJS.Signals, handleShutdown)
    })
    console.log(
      `[${new Date().toISOString()}] Graceful shutdown handlers registered for SIGINT and SIGTERM`,
    )
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
