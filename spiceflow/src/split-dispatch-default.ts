// Default split dispatch implementation for Node.js and Bun.
// Calls the dynamic import directly and wraps the result.

interface SplitChild {
  pattern: string
  loader: () => Promise<any>
}

interface SplitHandler {
  handle: (request: Request) => Promise<Response>
}

export async function resolveSplitHandler(split: SplitChild): Promise<SplitHandler> {
  const mod = await split.loader()
  const subApp = mod.default ?? mod.app ?? mod
  if (typeof subApp.handle === 'function') return subApp
  if (typeof subApp.fetch === 'function') {
    return { handle: (r: Request) => subApp.fetch(r) }
  }
  throw new Error(
    `Split sub-app for "${split.pattern}" must export a Spiceflow instance or an object with a handle/fetch method`,
  )
}
