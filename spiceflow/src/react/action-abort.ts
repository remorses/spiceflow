// Maps server action IDs to their in-flight AbortControllers.
// Written by callServer() in entry.client.tsx, read by getActionAbortController().
// Keyed by the $$id string that React sets on server reference functions.
// If the same action is called concurrently, the latest call's controller overwrites
// the previous one — matching the common "cancel and re-fetch" pattern.
export const actionAbortControllers = new Map<string, AbortController>()

/**
 * Returns the AbortController for the most recent in-flight call to a server action.
 * Returns `undefined` if the action has no in-flight call.
 *
 * The returned controller can be used to abort the fetch:
 * ```ts
 * getActionAbortController(myAction)?.abort()
 * ```
 *
 * Or to listen for abort:
 * ```ts
 * getActionAbortController(myAction)?.signal.addEventListener('abort', () => { ... })
 * ```
 */
export function getActionAbortController(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  actionFn: Function,
): AbortController | undefined {
  const id = (actionFn as { $$id?: string }).$$id
  if (!id) {
    throw new Error(
      '[spiceflow] getActionAbortController: argument is not a server action. ' +
        'Expected a function with a $$id property (created by "use server").',
    )
  }
  return actionAbortControllers.get(id)
}
