// Vite plugin that prevents .server.ts/.server.tsx files from being imported
// in the client environment. Similar to React Router's dot-server guard.
// Only targets the 'client' Vite environment — RSC and SSR environments are
// server-side and allowed to import these files freely.
//
// Uses resolveId to intercept imports before they load. Vite's multi-environment
// dev server calls resolveId through the full plugin pipeline for all imports,
// including relative ones like ./secret.server.
import path from 'node:path'
import type { Plugin } from 'vite'

const serverFileRE = /\.server(\.[cm]?[jt]sx?)?$/
const serverDirRE = /\/\.server\//

export function serverFileGuardPlugin(): Plugin {
  return {
    name: 'spiceflow:dot-server',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      if (this.environment.name !== 'client') return

      // Skip Vite's optimizeDeps scanner — it needs to crawl everything
      if ((options as { scan?: boolean })?.scan) return

      // Quick check on the raw import specifier before doing a full resolve
      const couldBeServer =
        serverFileRE.test(id) || serverDirRE.test(id) || id.includes('.server')
      if (!couldBeServer) return

      // Recursion guard: avoid infinite loop from our own this.resolve() call
      if (options?.custom?.['spiceflow:dot-server']) return

      const resolved = await this.resolve(id, importer, {
        ...options,
        custom: { ...options?.custom, 'spiceflow:dot-server': true },
      })
      if (!resolved) return

      const isDotServer =
        serverFileRE.test(resolved.id) || serverDirRE.test(resolved.id)
      if (!isDotServer) return
      if (!importer) return

      const importerShort = path.relative(process.cwd(), importer)
      const moduleShort = path.relative(process.cwd(), resolved.id)

      throw new Error(
        [
          `Server-only module referenced by client`,
          ``,
          `  '${moduleShort}' imported by '${importerShort}'`,
          ``,
          `  Files ending in .server.ts (or inside a .server/ directory) can only`,
          `  be imported from server code (RSC or SSR environments).`,
          ``,
        ].join('\n'),
      )
    },
  }
}
