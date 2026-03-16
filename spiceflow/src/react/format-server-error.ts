// Rewrites cryptic "X is not a function" TypeError messages into
// actionable errors when client-only React APIs are used in Server Components.
// React's react-server build omits these exports (they resolve to undefined),
// so calling them throws a generic TypeError. This formatter catches that
// pattern and replaces it with a message telling the developer to add "use client".

const clientOnlyHooks = [
  'useActionState',
  'useDeferredValue',
  'useEffect',
  'useEffectEvent',
  'useImperativeHandle',
  'useInsertionEffect',
  'useLayoutEffect',
  'useOptimistic',
  'useReducer',
  'useRef',
  'useState',
  'useSyncExternalStore',
  'useTransition',
]

function setMessage(error: Error, message: string) {
  error.message = message
  if (error.stack) {
    const lines = error.stack.split('\n')
    lines[0] = message
    error.stack = lines.join('\n')
  }
}

export function formatServerError(error: unknown): void {
  if (!(error instanceof Error) || typeof error.message !== 'string') return

  if (
    error.message.includes(
      'Class extends value undefined is not a constructor or null',
    )
  ) {
    const hint =
      'React Class Components cannot be rendered in Server Components. Add the "use client" directive at the top of the file.'
    if (error.message.includes(hint)) return
    setMessage(error, `${error.message}\n\n${hint}`)
    return
  }

  if (error.message.includes('createContext is not a function')) {
    setMessage(
      error,
      'createContext only works in Client Components. Add the "use client" directive at the top of the file to use it.',
    )
    return
  }

  for (const hook of clientOnlyHooks) {
    if (new RegExp(`\\b${hook}\\b.*is not a function`).test(error.message)) {
      setMessage(
        error,
        `${hook} only works in Client Components. Add the "use client" directive at the top of the file to use it.`,
      )
      return
    }
  }
}
