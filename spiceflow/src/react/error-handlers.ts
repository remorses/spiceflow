// Set React 19 root error handlers (onCaughtError, onUncaughtError,
// onRecoverableError) that spiceflow's client entry reads at hydration time.
//
// Call this before React hydrates (e.g. in a <script> tag or at the top of
// your observability SDK init). The handlers fire for every React render
// error globally, even when the user has their own ErrorBoundary.
//
// Usage with Strada SDK:
//
//   import { setReactErrorHandlers } from 'spiceflow/react'
//   import { captureException } from '@strada.sh/sdk'
//
//   setReactErrorHandlers({
//     onCaughtError: (error, errorInfo) => captureException(error, { componentStack: errorInfo.componentStack }),
//     onUncaughtError: (error, errorInfo) => captureException(error, { componentStack: errorInfo.componentStack }),
//   })

export type ReactErrorHandlers = {
  onCaughtError?: (error: unknown, errorInfo: { componentStack?: string }) => void
  onUncaughtError?: (error: unknown, errorInfo: { componentStack?: string }) => void
  onRecoverableError?: (error: unknown, errorInfo: { componentStack?: string }) => void
}

export function setReactErrorHandlers(handlers: ReactErrorHandlers): void {
  if (handlers.onCaughtError) globalThis.__spiceflow_onCaughtError = handlers.onCaughtError
  if (handlers.onUncaughtError) globalThis.__spiceflow_onUncaughtError = handlers.onUncaughtError
  if (handlers.onRecoverableError) globalThis.__spiceflow_onRecoverableError = handlers.onRecoverableError
}
