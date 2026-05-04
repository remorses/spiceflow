import { AsyncLocalStorage } from 'node:async_hooks'

// Stores the current Request during server action execution so action code
// can access request.signal to detect client-side abort.
export const actionRequestStorage = new AsyncLocalStorage<Request>()

/**
 * Returns the `Request` for the currently executing server action.
 * The request's `signal` is aborted when the client disconnects
 * (e.g. the user called `getActionAbortController(action).abort()`).
 *
 * Must be called inside a server action — throws if called outside.
 *
 * ```ts
 * "use server"
 * import { getActionRequest } from 'spiceflow'
 *
 * export async function myAction() {
 *   const request = getActionRequest()
 *   // Check if client disconnected
 *   if (request.signal.aborted) return
 *   // Or pass signal to downstream work
 *   await fetch('https://api.example.com', { signal: request.signal })
 * }
 * ```
 */
export function getActionRequest(): Request {
  const request = actionRequestStorage.getStore()
  if (!request) {
    throw new Error(
      '[spiceflow] getActionRequest must be called inside a server action. ' +
        'It uses AsyncLocalStorage to access the request for the current action call.',
    )
  }
  return request
}

/**
 * Run a server action with request context populated so `getActionRequest()`
 * works inside the action. Useful for testing actions that read the request
 * (e.g. for abort signals, headers, cookies).
 *
 * Actions that don't call `getActionRequest()` can be called directly without
 * this wrapper.
 *
 * ```ts
 * import { runAction } from 'spiceflow/testing'
 *
 * const result = await runAction(myAction)
 * const result = await runAction(() => myAction('arg1', 'arg2'))
 * const result = await runAction(myAction, {
 *   request: new Request('http://localhost', {
 *     method: 'POST',
 *     headers: { cookie: 'session=abc' },
 *   }),
 * })
 * ```
 */
export async function runAction<T>(
  action: () => T | Promise<T>,
  options?: { request?: Request },
): Promise<T> {
  const request =
    options?.request ??
    new Request('http://localhost', { method: 'POST' })
  return actionRequestStorage.run(request, () => action())
}
