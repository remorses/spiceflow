// RSC-environment SSR bridge. Loads the SSR module via Vite RSC API and
// renders HTML from an already-produced flight stream response.
// Resolved via package.json "react-server" condition — only runs in RSC env.

export async function renderSsr(
  flightResponse: Response,
  request: Request,
): Promise<Response> {
  const mod = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.js')
  >('ssr', 'index')
  return mod.renderHtml({ response: flightResponse, request })
}
