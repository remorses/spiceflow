// Federation utilities for the RSC environment.
// Resolved via package.json exports under the "react-server" condition.

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
}> {
  const remoteId = 'r_' + Math.random().toString(36).slice(2, 10)

  // Collect client references during rendering
  const clientModules: Record<string, { chunks: string[] }> = {}

  const flightStream = renderToReadableStream(
    element,
    undefined, // options
    {
      onClientReference(metadata: { id: string; name: string; deps: { js: string[]; css: string[] } }) {
        // Only include user-component chunks, not the entry bootstrap or
        // framework runtime. The host app provides its own runtime — loading
        // the remote's entry chunk would double-hydrate and conflict.
        const userChunks = metadata.deps.js.filter(
          (js) => !js.includes('index-') && !js.includes('spiceflow-framework'),
        )
        if (userChunks.length > 0) {
          clientModules[metadata.id] = { chunks: userChunks }
        }
      },
    },
  )
  const flightPayload = await streamToString(flightStream)

  return { remoteId, flightPayload, clientModules }
}
