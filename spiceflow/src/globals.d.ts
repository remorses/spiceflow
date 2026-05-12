// Global type augmentations for spiceflow internals.

declare var __SPICEFLOW_PRERENDER: boolean | undefined

declare module 'cloudflare:workers' {
  export function waitUntil(promise: Promise<unknown>): void
}

// Ambient type for ?split imports so TypeScript doesn't error on
// import('./module?split'). The actual module is resolved by the
// spiceflow Vite plugin at build time.
declare module '*?split' {
  const mod: { default: any; [key: string]: any }
  export default mod.default
  export = mod
}

declare var Deno:
  | {
      serve: (
        options: { port: number; hostname?: string },
        handler: (request: Request) => Response | Promise<Response>,
      ) => unknown
    }
  | undefined
