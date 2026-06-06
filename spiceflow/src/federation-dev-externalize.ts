// Vite plugin that externalizes React (and other shared modules) from client
// component chunks in dev mode for federation remotes. Without this, Vite's
// dev server resolves import "react" to pre-bundled internal paths like
// /@fs/.../node_modules/.vite/deps/react.js. Federation consumers need bare
// specifiers so the browser resolves them via the import map injected in HTML.
//
// Only active for federation: 'remote' and only affects the client environment.
// The ssr and rsc environments continue resolving React normally through Vite's
// module graph.
//
// Three mechanisms work together:
// 1. configEnvironment: excludes externalized modules from dep optimization
//    and disables OXC Fast Refresh for client chunks (overrides @vitejs/plugin-react)
// 2. resolveId hook: returns { id, external: true } so Vite skips resolution
// 3. transform hook (late): strips /@id/ prefix that vite:import-analysis adds
//    for external modules, and strips CSS side-effect imports
import type { Plugin } from 'vite'

const resolvedExternals = new Set<string>()

function isExternal(id: string, externals: string[]): boolean {
  return externals.some((ext) => id === ext || id.startsWith(`${ext}/`))
}

export function federationDevExternalizePlugin(
  externals: string[],
): Plugin[] {
  // Pre-populate the set so resolveId works on first run without discovery
  for (const ext of externals) resolvedExternals.add(ext)

  return [
    {
      name: 'spiceflow:federation-dev-externalize',
      enforce: 'pre',
      apply: 'serve',

      // Disable Fast Refresh so @vitejs/plugin-react doesn't inject
      // $RefreshReg$/$RefreshSig$ into client chunks. Federation consumers
      // load these cross-origin where HMR preamble would throw.
      config() {
        return { server: { hmr: false } }
      },

      configEnvironment(name, config: any) {
        if (name !== 'client') return
        // Exclude from dep optimization so Vite doesn't pre-bundle them
        config.optimizeDeps ??= {}
        config.optimizeDeps.exclude ??= []
        for (const ext of externals) {
          if (!config.optimizeDeps.exclude.includes(ext)) {
            config.optimizeDeps.exclude.push(ext)
          }
        }
      },

      resolveId(id) {
        if (this.environment?.name !== 'client') return null
        if (isExternal(id, externals)) {
          resolvedExternals.add(id)
          return { id, external: true }
        }
        return null
      },

      load(id) {
        if (this.environment?.name !== 'client') return null
        if (resolvedExternals.has(id)) {
          return { code: 'export default {};' }
        }
        return null
      },
    },
    {
      // Must run AFTER vite:import-analysis which adds /@id/ prefixes.
      // Push via configResolved so it lands at the very end of the pipeline.
      name: 'spiceflow:federation-dev-externalize-setup',
      apply: 'serve',
      configResolved(resolvedConfig) {
        ;(resolvedConfig.plugins as Plugin[]).push(
          federationDevCleanupPlugin(resolvedConfig.base || '/'),
        )
      },
    },
  ]
}

// Late-running transform that cleans up client component modules for federation:
// strips /@id/ prefixes and CSS side-effect imports.
function federationDevCleanupPlugin(base: string): Plugin {
  return {
    name: 'spiceflow:federation-dev-cleanup',
    transform(code) {
      if (this.environment?.name !== 'client') return null

      let result = code

      // Strip /@id/ prefixes for externalized modules
      if (resolvedExternals.size > 0) {
        const escaped = [...resolvedExternals]
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|')
        const prefix = base.endsWith('/') ? base : base + '/'
        const prefixRegex = new RegExp(
          `${prefix.replace(/[/]/g, '\\/')}@id\\/(${escaped})`,
          'g',
        )
        result = result.replace(
          prefixRegex,
          (_match, externalName: string) => externalName,
        )
      }

      // Only clean up artifacts for "use client" modules (federation chunks)
      if (!result.includes('"use client"') && !result.includes("'use client'")) {
        return result !== code ? result : null
      }

      // Strip CSS side-effect imports (CSS is delivered via federation metadata)
      result = result.replace(/import\s+["'][^"']*\.css["'];?\s*/g, '')

      return result !== code ? result : null
    },
  }
}
