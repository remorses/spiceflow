// Federation RSC entry point. Renders a React element to an SSE-formatted
// Response containing metadata, SSR HTML, and Flight payload rows. The SSE
// format is designed so that streaming can be added later (multiple flight
// events arriving incrementally) without a breaking change.
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

function formatSSEEvent(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`
}

/**
 * Renders a React element to a federation Response in SSE format.
 *
 * The response contains these events in order:
 * - `metadata` — remoteId, clientModules map, cssLinks
 * - `ssr` — pre-rendered HTML for immediate display
 * - `flight` (one or more) — RSC Flight payload rows
 * - `done` — signals the end of the payload
 *
 * Call this from a route handler to expose a component for federation.
 * The returned Response has the correct content-type and CORS headers.
 */
export async function renderComponentPayload(element: React.ReactElement): Promise<Response> {
  const remoteId = 'r_' + Math.random().toString(36).slice(2, 10)

  const clientModules: Record<string, { chunks: string[]; css: string[] }> = {}
  const cssLinksSet = new Set<string>()

  const flightStream = renderToReadableStream(
    element,
    undefined, // options
    {
      onClientReference(metadata: { id: string; name: string; deps: { js: string[]; css: string[] } }) {
        const userChunks = metadata.deps.js.filter(
          (js) => js.includes('user-components'),
        )
        for (const css of metadata.deps.css) {
          cssLinksSet.add(css)
        }
        if (userChunks.length > 0) {
          clientModules[metadata.id] = { chunks: userChunks, css: metadata.deps.css }
        }
      },
    },
  )
  const flightPayload = await streamToString(flightStream)

  const cssLinks = [...cssLinksSet]

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

  let body = ''
  body += formatSSEEvent('metadata', JSON.stringify({ remoteId, clientModules, cssLinks }))
  body += formatSSEEvent('ssr', JSON.stringify({ html: ssrHtml }))

  // Split Flight payload into individual rows and emit each as a separate
  // flight event. Flight rows are newline-delimited — each row becomes its
  // own event so that streaming can later emit them incrementally.
  const flightRows = flightPayload.split('\n').filter(Boolean)
  for (const row of flightRows) {
    body += formatSSEEvent('flight', row)
  }

  body += formatSSEEvent('done', '')

  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*',
    },
  })
}
