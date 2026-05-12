// Default lazy dispatch implementation for Node.js and Bun.
// Calls the dynamic import directly and wraps the result.

interface LazyChild {
  pattern: string
  loader: () => Promise<any>
}

interface LazyHandler {
  handle: (request: Request) => Promise<Response>
}

export async function resolveLazyHandler(lazy: LazyChild): Promise<LazyHandler> {
  const mod = await lazy.loader()
  const subApp = mod.default ?? mod.app ?? mod
  if (typeof subApp.handle === 'function') return subApp
  if (typeof subApp.fetch === 'function') {
    return { handle: (r: Request) => subApp.fetch(r) }
  }
  throw new Error(
    `Lazy sub-app for "${lazy.pattern}" must export a Spiceflow instance or an object with a handle/fetch method`,
  )
}
