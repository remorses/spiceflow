import { renderToReadableStream } from '#rsc-runtime'

export { renderToReadableStream }

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode()
  return result
}

/**
 * Renders a React element to a federation payload containing the RSC Flight stream
 * and a client module manifest mapping module IDs to chunk URLs.
 *
 * Call this from a route handler to expose a component for federation.
 */
export async function renderComponentPayload(element: React.ReactElement): Promise<{
  remoteId: string
  flightPayload: string
  clientModules: Record<string, { chunks: string[] }>
  ssrHtml: string
}> {
  const remoteId = 'r_' + Math.random().toString(36).slice(2, 10)

  const clientModules: Record<string, { chunks: string[] }> = {}

  const flightStream = renderToReadableStream(
    element,
    undefined, // options
    {
      onClientReference(metadata: { id: string; name: string; deps: { js: string[]; css: string[] } }) {
        const userChunks = metadata.deps.js.filter(
          (js) => js.includes('user-components'),
        )
        if (userChunks.length > 0) {
          clientModules[metadata.id] = { chunks: userChunks }
        }
      },
    },
  )
  const flightPayload = await streamToString(flightStream)

  // Render SSR HTML by decoding the Flight payload in the SSR environment.
  // Uses the same cross-environment call pattern as handle-ssr.rsc.ts.
  let ssrHtml = ''
  try {
    const ssrModule = await import.meta.viteRsc.loadModule<
      typeof import('./react/entry.ssr.js')
    >('ssr', 'index')
    ssrHtml = await ssrModule.renderFlightToHtml(flightPayload)
  } catch {
    // SSR HTML is best-effort — degrade to empty string (client decoding
    // still works, the user just sees a brief flash of empty content).
  }

  return { remoteId, flightPayload, clientModules, ssrHtml }
}
