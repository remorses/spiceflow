// Prerendered responses served by the app itself, after middleware.
// Only Cloudflare needs this (see prerendered.workerd.ts). Node serves the
// prerendered files with serveStatic, which also runs after middleware.

/** One stored response. `file` is relative to `PRERENDER_ASSETS_DIR/<deploymentId>/`. */
export type PrerenderedFile = { file: string; contentType?: string }

/** `manifest.json` written next to the files. Keys are route paths like `/about`. */
export type PrerenderedManifest = {
  routes: Record<string, { html?: PrerenderedFile; rsc?: PrerenderedFile; body?: PrerenderedFile }>
}

export async function readPrerendered(_options: {
  request: Request
  path: string
  rsc: boolean
}): Promise<Response | undefined> {
  return undefined
}
