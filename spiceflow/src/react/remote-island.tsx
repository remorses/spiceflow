'use client'

import { useEffect, useRef } from 'react'

interface ClientModules {
  [id: string]: { chunks: string[] }
}

export function RemoteIsland({
  flightPayload,
  remoteOrigin,
  remoteId,
  clientModules,
}: {
  flightPayload: string
  remoteOrigin: string
  remoteId: string
  clientModules: ClientModules
}) {
  const ref = useRef<HTMLDivElement>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current || !ref.current) return
    hydrated.current = true
    hydrateRemote(ref.current, flightPayload, remoteOrigin, clientModules)
  }, [flightPayload, remoteOrigin])

  return <div ref={ref} data-remote-id={remoteId} />
}

async function hydrateRemote(
  container: HTMLElement,
  flightPayload: string,
  remoteOrigin: string,
  clientModules: ClientModules,
) {
  const { createRoot } = await import('react-dom/client')
  const g = globalThis as any

  // Pre-load all remote chunks and extract exports.
  // Keys are module IDs, values are module namespace objects (e.g. { Counter: fn }).
  const remoteExports: Record<string, any> = {}
  for (const [moduleId, info] of Object.entries(clientModules)) {
    for (const chunkPath of info.chunks) {
      const chunkUrl = remoteOrigin + chunkPath
      console.log('[RemoteIsland] loading chunk:', chunkUrl)
      const mod = await import(/* @vite-ignore */ chunkUrl)
      const exportName = 'export_' + moduleId
      if (mod[exportName]) {
        remoteExports[moduleId] = mod[exportName]
      }
    }
  }

  // Patch client require to resolve remote module IDs.
  // The Flight decoder's `d()` function calls `__vite_rsc_require__` → `__vite_rsc_client_require__`
  // and accesses named exports directly on the return value (e.g. result["Counter"]).
  // For non-async modules it does NOT unwrap thenables, so we must return
  // the module namespace object directly — NOT wrapped in Promise.resolve().
  const origRequire = g.__vite_rsc_client_require__
  if (origRequire) {
    g.__vite_rsc_client_require__ = (id: string) => {
      const cleanId = id.split('$$cache=')[0]
      if (remoteExports[cleanId]) return remoteExports[cleanId]
      return origRequire(id)
    }
  }

  // Decode the Flight payload using host's global decoder
  const createFromReadableStream = g.__spiceflow_createFromReadableStream
  if (!createFromReadableStream) {
    console.error('[RemoteIsland] Flight decoder not available')
    return
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(flightPayload))
      controller.close()
    },
  })

  const tree = await (createFromReadableStream(stream) as Promise<any>)
  const root = createRoot(container)
  root.render(tree)
}
