// Middleware that tracks in-flight requests and pending waitUntil promises,
// preventing the process from exiting while work is still in progress.
import { Spiceflow } from './spiceflow.js'
import { pendingWaitUntilCount } from '#wait-until'

interface GracefulShutdownOptions {
  maxWaitSeconds?: number
  checkIntervalMs?: number
}

export function preventProcessExitIfBusy(
  options: GracefulShutdownOptions = {},
): any {
  const { maxWaitSeconds = 300, checkIntervalMs = 250 } = options

  let inFlightRequests = 0
  let isShuttingDown = false

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

  function isBusy() {
    return inFlightRequests > 0 || pendingWaitUntilCount() > 0
  }

  async function handleShutdown(signal: NodeJS.Signals) {
    if (isShuttingDown) return
    isShuttingDown = true

    const startTime = Date.now()
    const deadline = Date.now() + maxWaitSeconds * 1000

    while (isBusy() && Date.now() < deadline) {
      await sleep(checkIntervalMs)
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)

    if (isBusy()) {
      console.error(
        `[${new Date().toISOString()}] Shutdown timeout reached after ${elapsedSeconds}s; ${inFlightRequests} request(s) and ${pendingWaitUntilCount()} waitUntil promise(s) still in progress, forcing exit`,
      )
    }

    process.exit(isBusy() ? 1 : 0)
  }

  if (typeof process !== 'undefined' && process.prependListener) {
    ;['SIGINT', 'SIGTERM'].forEach((sig) => {
      process.prependListener(sig as NodeJS.Signals, handleShutdown)
    })
  }

  return new Spiceflow({ scoped: false }).use(async (_, next) => {
    inFlightRequests++
    try {
      await next()
    } finally {
      inFlightRequests--
    }
  })
}
