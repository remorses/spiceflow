// Vite adapter for the SSR environment.
// Wraps @vitejs/plugin-rsc/ssr and Vite-specific import.meta.viteRsc APIs.
export { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'

export async function loadBootstrapScriptContent(): Promise<string> {
  return import.meta.viteRsc.loadBootstrapScriptContent('index')
}

export async function importRscEnvironment(): Promise<typeof import('../entry.rsc.js')> {
  return import.meta.viteRsc.loadModule<typeof import('../entry.rsc.js')>(
    'rsc',
    'index',
  )
}
