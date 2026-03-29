'use client'

import React, { useEffect, useState } from 'react'

interface ClientModules {
  [id: string]: { chunks: string[]; css?: string[] }
}

// Module-level registry: maps clean module IDs → module namespace objects.
// Populated by decodeRemoteTree, read by the patched __vite_rsc_client_require__.
const remoteRegistry = new Map<string, Record<string, any>>()

// One-time idempotent patch of the global client require function.
// Wraps only once — concurrent RemoteIslands all share the same registry.
let requirePatched = false
function ensureRequirePatched() {
  if (requirePatched) return
  requirePatched = true
  const g = globalThis as any
  const orig = g.__vite_rsc_client_require__
  if (!orig) return
  g.__vite_rsc_client_require__ = (id: string) => {
    const cleanId = id.split('$$cache=')[0]
    const mod = remoteRegistry.get(cleanId)
    if (mod) return mod
    return orig(id)
  }
}

// Cache decoded React trees by remoteId so re-renders don't re-decode.
// Bounded to prevent unbounded memory growth in long-lived sessions.
const MAX_TREE_CACHE = 100
const treeCache = new Map<string, Promise<React.ReactNode>>()

function getOrCreateTree({
  remoteId,
  flightPayload,
  remoteOrigin,
  clientModules,
}: {
  remoteId: string
  flightPayload: string
  remoteOrigin: string
  clientModules: ClientModules
}): Promise<React.ReactNode> {
  const cached = treeCache.get(remoteId)
  if (cached) return cached

  if (treeCache.size >= MAX_TREE_CACHE) {
    const oldest = treeCache.keys().next().value
    if (oldest) treeCache.delete(oldest)
  }

  const promise = decodeRemoteTree({ flightPayload, remoteOrigin, clientModules })
  treeCache.set(remoteId, promise)
  return promise
}

function resolveUrl(path: string, origin: string): string {
  return new URL(path, origin).toString()
}

async function decodeRemoteTree({
  flightPayload,
  remoteOrigin,
  clientModules,
}: {
  flightPayload: string
  remoteOrigin: string
  clientModules: ClientModules
}): Promise<React.ReactNode> {
  // Inject CSS <link> tags for remote stylesheets before rendering.
  for (const [, info] of Object.entries(clientModules)) {
    for (const cssPath of info.css ?? []) {
      const href = resolveUrl(cssPath, remoteOrigin)
      if (!document.querySelector(`link[href="${CSS.escape(href)}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        document.head.appendChild(link)
      }
    }
  }

  // Load all remote client component chunks and register their exports
  // before decoding the Flight payload, so the Flight decoder can
  // resolve client references synchronously.
  for (const [moduleId, info] of Object.entries(clientModules)) {
    for (const chunkPath of info.chunks) {
      const chunkUrl = resolveUrl(chunkPath, remoteOrigin)
      const mod = await import(/* @vite-ignore */ chunkUrl)
      // TODO: fragile — relies on vite-plugin-rsc emitting named exports as
      // `export_<moduleId>` in client chunks. If the plugin changes its export
      // naming convention this lookup will silently fail and remote client
      // components won't hydrate.
      const exportName = 'export_' + moduleId
      if (mod[exportName]) {
        remoteRegistry.set(moduleId, mod[exportName])
      }
    }
  }

  ensureRequirePatched()

  const createFromReadableStream = globalThis.__spiceflow_createFromReadableStream
  if (!createFromReadableStream) {
    throw new Error(
      '[RemoteIsland] Flight decoder not available — ensure the host app is a spiceflow RSC app',
    )
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(flightPayload))
      controller.close()
    },
  })

  return createFromReadableStream(stream) as Promise<React.ReactNode>
}

// Renders the decoded remote tree inline in the host React tree instead of
// in a separate createRoot. Remote client components share host context,
// appear in React DevTools, and benefit from shared React instance.
//
// During SSR, renders the pre-rendered HTML from the remote server via
// dangerouslySetInnerHTML so the content is visible without JavaScript.
// After client hydration, the Flight payload is decoded and the static
// HTML is replaced with the interactive React tree.
export function RemoteIsland({
  flightPayload,
  remoteOrigin,
  remoteId,
  clientModules,
  ssrHtml,
}: {
  flightPayload: string
  remoteOrigin: string
  remoteId: string
  clientModules: ClientModules
  ssrHtml?: string
}) {
  const [tree, setTree] = useState<React.ReactNode>(null)

  useEffect(() => {
    let cancelled = false
    getOrCreateTree({ remoteId, flightPayload, remoteOrigin, clientModules }).then(
      (decoded) => {
        if (!cancelled) setTree(decoded)
      },
    )
    return () => {
      cancelled = true
    }
  }, [remoteId, flightPayload, remoteOrigin])

  // Before Flight decoding completes, show the pre-rendered SSR HTML.
  // This matches both SSR output and initial client render (no hydration mismatch).
  // Once the Flight tree is decoded, switch to the interactive React tree.
  if (!tree && ssrHtml) {
    return (
      <div
        data-remote-id={remoteId}
        dangerouslySetInnerHTML={{ __html: ssrHtml }}
      />
    )
  }

  return <div data-remote-id={remoteId}>{tree}</div>
}
