// Vite adapter for the SSR environment.
// Wraps @vitejs/plugin-rsc/ssr and Vite-specific import.meta.viteRsc APIs.
export { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'

export async function loadBootstrapScriptContent(): Promise<string> {
  return import.meta.viteRsc.loadBootstrapScriptContent('index')
}

// The specifier must be a string literal because @vitejs/plugin-rsc statically
// analyzes import.meta.viteRsc.import() calls at transform time. The path is
// relative to this file (adapters/), so '../entry.rsc' points to react/entry.rsc.
export async function importRscEnvironment(): Promise<typeof import('../entry.rsc.js')> {
  return import.meta.viteRsc.import<typeof import('../entry.rsc.js')>(
    '../entry.rsc',
    { environment: 'rsc' },
  )
}
