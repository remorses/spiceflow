// Global type augmentations for spiceflow internals.

declare var __SPICEFLOW_PRERENDER: boolean | undefined

declare module 'cloudflare:workers' {
  export function waitUntil(promise: Promise<unknown>): void
}

declare var Deno:
  | {
      serve: (
        options: { port: number; hostname?: string },
        handler: (request: Request) => Response | Promise<Response>,
      ) => unknown
    }
  | undefined
