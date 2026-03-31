'use client'

import React, { useLayoutEffect, useRef } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { type ContextBridge, useContextBridge } from 'its-fine'

const isBrowser = typeof window !== 'undefined'

// During SSR, useContextBridge throws because FiberProvider doesn't exist in
// the server render tree. Context bridging is only meaningful on the client
// anyway (server has no interactive contexts to bridge), so return a
// passthrough wrapper on the server.
const PassthroughBridge: ContextBridge = ({ children }) =>
  children as React.ReactElement

function useContextBridgeSafe(): ContextBridge {
  if (!isBrowser) return PassthroughBridge
  return useContextBridge()
}

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

// Inject CSS <link> tags into a target root (document.head or a shadow root).
function injectCssLinks(
  target: Document | ShadowRoot,
  clientModules: ClientModules,
  remoteOrigin: string,
) {
  for (const [, info] of Object.entries(clientModules)) {
    for (const cssPath of info.css ?? []) {
      const href = resolveUrl(cssPath, remoteOrigin)
      if (!target.querySelector(`link[href="${CSS.escape(href)}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        if (target instanceof Document) {
          target.head.appendChild(link)
        } else {
          target.appendChild(link)
        }
      }
    }
  }
}

// Inject top-level cssLinks (from the payload) into a shadow root.
function injectTopLevelCssLinks(
  shadow: ShadowRoot,
  cssLinks: string[],
  remoteOrigin: string,
) {
  for (const cssHref of cssLinks) {
    const href = new URL(cssHref, remoteOrigin).toString()
    if (!shadow.querySelector(`link[href="${CSS.escape(href)}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      shadow.appendChild(link)
    }
  }
}

// Pure decode function: loads remote chunks and decodes the Flight payload.
// No CSS side effects — CSS injection is handled in the mount effect where
// the correct target (document.head or shadow root) is known.
async function decodeRemoteTree({
  flightPayload,
  remoteOrigin,
  clientModules,
}: {
  flightPayload: string
  remoteOrigin: string
  clientModules: ClientModules
}): Promise<React.ReactNode> {
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

// Renders the decoded remote tree using hydrateRoot so React patches the
// existing SSR DOM nodes instead of clearing and remounting them.
//
// The host React tree always renders dangerouslySetInnerHTML. React only
// re-applies innerHTML when __html changes (string comparison in reconciler),
// so after hydrateRoot/createRoot takes ownership the host never overwrites it.
//
// useContextBridge (from its-fine) collects all React contexts from the host
// fiber tree and re-provides them inside the remote root. This means remote
// client components can read host-provided contexts (theme, auth, i18n, etc.)
// even though they live in a separate React root.
//
// useRouterState also works because it uses a module-level history singleton
// (useSyncExternalStore), not React context — the shared spiceflow/react
// module via import map makes it accessible across roots.
//
// First mount: hydrateRoot patches the SSR HTML DOM (no clearing).
// On remoteId change: ssrHtml changes → React updates innerHTML first (new
// content visible immediately), then createRoot re-mounts the new tree.
//
// When isolateStyles is true, content renders inside a Shadow DOM:
// - SSR: Declarative Shadow DOM (<template shadowrootmode="open">) wraps the
//   SSR HTML + CSS links so the browser creates the shadow root before JS loads.
//   DSD is parser-only — it only works during initial HTML parsing, not when set
//   via innerHTML (e.g. client-side navigation). The effect falls back to
//   attachShadow() when no parser-created shadow root exists.
// - Client: useLayoutEffect gets or creates the shadow root, injects CSS links
//   inside it, then hydrates/renders into a mount point within the shadow.
// - Remote styles stay inside the shadow root, host styles stay outside.
//   CSS custom properties (variables) still penetrate for theming.
export function RemoteIsland({
  flightPayload,
  remoteOrigin,
  remoteId,
  clientModules,
  ssrHtml,
  cssLinks,
  isolateStyles,
}: {
  flightPayload: string
  remoteOrigin: string
  remoteId: string
  clientModules: ClientModules
  ssrHtml?: string
  cssLinks?: string[]
  isolateStyles?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<ReturnType<typeof hydrateRoot> | ReturnType<typeof createRoot> | null>(null)
  // Track whether this island has been mounted (via hydrate or createRoot).
  // Prevents false hydration attempts on remoteId changes after an imperative
  // first mount — hasChildNodes() would be true from old client-rendered DOM,
  // but that's not SSR HTML so hydrateRoot would fail.
  const hasMountedRef = useRef(false)
  // Bridge all host contexts into the remote root so remote client components
  // can read host-provided React contexts (theme, auth, i18n, etc.).
  const Bridge = useContextBridgeSafe()

  // Start decoding immediately during render so chunk loading and Flight
  // decoding overlap with React's commit phase instead of waiting for it.
  // treeCache deduplicates, so the useLayoutEffect below awaits the same promise.
  if (isBrowser) {
    getOrCreateTree({ remoteId, flightPayload, remoteOrigin, clientModules })
  }

  useLayoutEffect(() => {
    const host = containerRef.current
    if (!host) return

    let isMounted = true

    if (isolateStyles) {
      // Shadow DOM path: render inside a shadow root for style isolation.
      // DSD may have already created the shadow root from SSR HTML parsing.
      const existingShadow = host.shadowRoot
      const shadow = existingShadow ?? host.attachShadow({ mode: 'open' })

      // Inject top-level CSS links inside the shadow root
      injectTopLevelCssLinks(shadow, cssLinks ?? [], remoteOrigin)
      // Inject per-component CSS links inside the shadow root
      injectCssLinks(shadow, clientModules, remoteOrigin)

      // Find or create the mount point inside the shadow
      let mountPoint = shadow.querySelector('[data-mount]') as HTMLDivElement | null
      if (!mountPoint) {
        mountPoint = document.createElement('div')
        mountPoint.setAttribute('data-mount', '')
        shadow.appendChild(mountPoint)
      }

      getOrCreateTree({ remoteId, flightPayload, remoteOrigin, clientModules }).then(
        (decoded) => {
          if (!isMounted) return
          const tree = <Bridge>{decoded as React.ReactElement}</Bridge>

          // Can only hydrate on first mount when a parser-created shadow root
          // exists (DSD from SSR) AND the mount point has SSR content to patch.
          // hasMountedRef prevents false hydration on remoteId changes where
          // mountPoint has stale client-rendered DOM, not SSR HTML.
          const canHydrate =
            !hasMountedRef.current &&
            !!ssrHtml &&
            !!existingShadow &&
            mountPoint!.hasChildNodes()

          hasMountedRef.current = true
          if (canHydrate) {
            rootRef.current = hydrateRoot(mountPoint!, tree, {
              onRecoverableError() {},
            })
          } else {
            mountPoint!.replaceChildren()
            const r = createRoot(mountPoint!)
            r.render(tree)
            rootRef.current = r
          }
        },
      )
    } else {
      // Default path: render directly in the container (no shadow DOM).
      // Inject CSS into document.head (same timing as shadow path injects into shadow root).
      injectCssLinks(document, clientModules, remoteOrigin)

      getOrCreateTree({ remoteId, flightPayload, remoteOrigin, clientModules }).then(
        (decoded) => {
          if (!isMounted) return
          const tree = <Bridge>{decoded as React.ReactElement}</Bridge>
          if (!hasMountedRef.current && ssrHtml) {
            hasMountedRef.current = true
            rootRef.current = hydrateRoot(host, tree, {
              onRecoverableError() {},
            })
          } else {
            hasMountedRef.current = true
            const r = createRoot(host)
            r.render(tree)
            rootRef.current = r
          }
        },
      )
    }

    return () => {
      isMounted = false
      rootRef.current?.unmount()
      rootRef.current = null
    }
  }, [remoteId, flightPayload, remoteOrigin, isolateStyles])

  // When isolating styles, wrap SSR HTML in a Declarative Shadow DOM template
  // so the browser creates the shadow root during initial HTML parsing (before JS).
  // DSD is parser-only — only works during initial document parse, not innerHTML.
  if (isolateStyles) {
    const cssLinksHtml = (cssLinks ?? [])
      .map((href) => {
        const abs = new URL(href, remoteOrigin).toString()
        return `<link rel="stylesheet" href="${abs}">`
      })
      .join('')

    const dsdHtml = ssrHtml
      ? `<template shadowrootmode="open">${cssLinksHtml}<div data-mount>${ssrHtml}</div></template>`
      : ''

    return (
      <div
        ref={containerRef}
        data-remote-id={remoteId}
        data-isolate-styles
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: dsdHtml }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      data-remote-id={remoteId}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: ssrHtml ?? '' }}
    />
  )
}
