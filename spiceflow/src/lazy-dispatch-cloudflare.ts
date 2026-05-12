// Cloudflare lazy dispatch implementation.
// Uses the LOADER binding (Dynamic Workers) to load sub-app chunks
// from ASSETS and run them in isolated V8 isolates.
//
// The Vite plugin embeds manifest data (entry, modules, content-hashed id)
// directly in the replaced import() call, so no separate manifest.json
// file or name-based lookup is needed.

interface LazyChild {
  pattern: string
  loader: () => Promise<any>
}

interface LazyHandler {
  handle: (request: Request) => Promise<Response>
}

interface WorkerManifest {
  id: string
  entry: string
  modules: string[]
}

function resolveDirectImport(lazy: LazyChild, mod: any): LazyHandler {
  const subApp = mod.default ?? mod.app ?? mod
  if (typeof subApp.handle === 'function') return subApp
  if (typeof subApp.fetch === 'function') {
    return { handle: (r: Request) => subApp.fetch(r) }
  }
  throw new Error(
    `Lazy sub-app for "${lazy.pattern}" must export a Spiceflow instance`,
  )
}

export async function resolveLazyHandler(
  lazy: LazyChild,
): Promise<LazyHandler> {
  const mod = await lazy.loader()

  // If the Vite plugin embedded manifest data (Cloudflare build),
  // use LOADER to create an isolated Dynamic Worker.
  const manifest: WorkerManifest | undefined = mod?.__workerManifest
  if (!manifest) {
    // No manifest: direct import (Node/Bun/dev mode)
    return resolveDirectImport(lazy, mod)
  }

  let env: any
  try {
    const cfWorkers: any = await import('cloudflare:workers')
    env = cfWorkers.env
  } catch {
    return resolveDirectImport(lazy, mod)
  }

  if (!env.LOADER || !env.ASSETS) {
    throw new Error(
      `Lazy route "${lazy.pattern}" was built with ?split but Cloudflare ` +
        `LOADER/ASSETS bindings are missing. Add worker_loaders to wrangler.jsonc.`,
    )
  }

  // Use the content-hashed id so LOADER.get() doesn't serve stale code
  // after a new deployment with different sub-app code.
  // NOTE: Cloudflare bindings (KV, D1, R2, etc.) cannot be passed directly
  // to Dynamic Workers because they are not serializable. Lazy sub-apps
  // can use outbound fetch() but not parent bindings.
  const worker = env.LOADER.get(manifest.id, async () => {
    // Fetch all module chunks from ASSETS in parallel
    const moduleEntries = await Promise.all(
      manifest.modules.map(async (filename: string) => {
        const res = await env.ASSETS.fetch(
          new Request(`http://assets.local/__workers/${filename}`),
        )
        if (!res.ok) {
          throw new Error(
            `Failed to fetch worker module "${filename}" from ASSETS: ${res.status}`,
          )
        }
        return [filename, await res.text()] as const
      }),
    )

    return {
      mainModule: manifest.entry,
      modules: Object.fromEntries(moduleEntries),
      compatibilityDate: '2026-03-24',
      compatibilityFlags: ['nodejs_compat'],
    }
  })

  return {
    handle: (request: Request) => worker.getEntrypoint().fetch(request),
  }
}
