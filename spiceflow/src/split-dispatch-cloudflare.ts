// Cloudflare split dispatch implementation.
// Uses the LOADER binding (Dynamic Workers) to load sub-app chunks
// from ASSETS and run them in isolated V8 isolates.
//
// The Vite plugin embeds manifest data (entry, modules, content-hashed id)
// directly in the replaced import() call, so no separate manifest.json
// file or name-based lookup is needed.

interface SplitChild {
  pattern: string
  loader: () => Promise<any>
}

interface SplitHandler {
  handle: (request: Request) => Promise<Response>
}

interface WorkerManifest {
  id: string
  entry: string
  modules: string[]
}

function resolveDirectImport(split: SplitChild, mod: any): SplitHandler {
  const subApp = mod.default ?? mod.app ?? mod
  if (typeof subApp.handle === 'function') return subApp
  if (typeof subApp.fetch === 'function') {
    return { handle: (r: Request) => subApp.fetch(r) }
  }
  throw new Error(
    `Split sub-app for "${split.pattern}" must export a Spiceflow instance`,
  )
}

export async function resolveSplitHandler(
  split: SplitChild,
): Promise<SplitHandler> {
  const mod = await split.loader()

  // If the Vite plugin embedded manifest data (Cloudflare build),
  // use LOADER to create an isolated Dynamic Worker.
  const manifest: WorkerManifest | undefined = mod?.__workerManifest
  if (!manifest) {
    // No manifest: direct import (Node/Bun/dev mode)
    return resolveDirectImport(split, mod)
  }

  let env: any
  try {
    const cfWorkers: any = await import('cloudflare:workers')
    env = cfWorkers.env
  } catch {
    return resolveDirectImport(split, mod)
  }

  if (!env.LOADER || !env.ASSETS) {
    throw new Error(
      `Split route "${split.pattern}" was built as a split sub-app but Cloudflare ` +
        `LOADER/ASSETS bindings are missing. Add worker_loaders to wrangler.jsonc.`,
    )
  }

  // NOTE: Cloudflare bindings (KV, D1, R2, etc.) cannot be passed directly
  // to Dynamic Workers because they are not serializable. Split sub-apps
  // can use outbound fetch() but not parent bindings.
  //
  // LOADER.get() must be called per-request because the returned worker stub
  // is an I/O object bound to the request context that created it. Cloudflare
  // doesn't allow using I/O objects across request boundaries. The content-hashed
  // id ensures LOADER internally caches the compiled worker code across requests.
  const loaderFactory = async () => {
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
  }

  return {
    handle: async (request: Request) => {
      const worker = env.LOADER.get(manifest.id, loaderFactory)
      return worker.getEntrypoint().fetch(request)
    },
  }
}
