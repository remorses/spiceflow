// Federation RSC entry point. Renders a React element to an SSE-formatted
// Response containing metadata, SSR HTML, and Flight payload rows. The SSE
// format is designed so that streaming can be added later (multiple flight
// events arriving incrementally) without a breaking change.
import React from 'react'
import { renderToReadableStream } from '#rsc-runtime'

export { renderToReadableStream }

const encoder = new TextEncoder()

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

async function* streamFlightRows(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffered = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffered += decoder.decode(value, { stream: true })
    const rows = buffered.split('\n')
    buffered = rows.pop() ?? ''

    for (const row of rows) {
      if (!row) continue
      yield row
    }
  }

  buffered += decoder.decode()
  if (buffered) {
    yield buffered
  }
}

interface FederationPayloadMetadata {
  remoteId: string
  clientModules: Record<string, { chunks: string[]; css: string[] }>
  cssLinks: string[]
}

type FederationPayloadEvent =
  | { type: 'metadata'; payload: FederationPayloadMetadata }
  | { type: 'ssr'; payload: string }
  | { type: 'flight'; payload: string }
  | { type: 'done' }

async function* encodeFederationPayloadEvents({
  value,
}: {
  value: unknown
}): AsyncGenerator<FederationPayloadEvent> {
  const remoteId = 'r_' + Math.random().toString(36).slice(2, 10)

  const clientModules: Record<string, { chunks: string[]; css: string[] }> = {}
  const cssLinksSet = new Set<string>()

  const flightStream = renderToReadableStream(
    value,
    undefined,
    {
      onClientReference(metadata: {
        id: string
        name: string
        deps: { js: string[]; css: string[] }
      }) {
        for (const css of metadata.deps.css) {
          cssLinksSet.add(css)
        }

        const chunks = metadata.deps.js.length > 0
          ? metadata.deps.js.filter((js) => js.includes('user-components'))
          : [metadata.id]
        if (chunks.length > 0) {
          clientModules[metadata.id] = { chunks, css: metadata.deps.css }
        }
      },
    },
  )

  if (React.isValidElement(value)) {
    const flightPayload = await streamToString(flightStream)
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

    yield {
      type: 'metadata',
      payload: {
        remoteId,
        clientModules,
        cssLinks: [...cssLinksSet],
      },
    }
    yield { type: 'ssr', payload: ssrHtml }

    const flightRows = flightPayload.split('\n').filter(Boolean)
    for (const row of flightRows) {
      yield { type: 'flight', payload: row }
    }

    yield { type: 'done' }
    return
  }

  yield {
    type: 'metadata',
    payload: {
      remoteId,
      clientModules,
      cssLinks: [...cssLinksSet],
    },
  }
  yield { type: 'ssr', payload: '' }

  for await (const row of streamFlightRows(flightStream)) {
    yield { type: 'flight', payload: row }
  }

  yield { type: 'done' }
}

/**
 * Renders any Flight-serializable value to a federation Response in SSE format.
 *
 * The response contains these events in order:
 * - `metadata` — remoteId, clientModules map, cssLinks
 * - `ssr` — pre-rendered HTML for immediate display when the top-level payload is a React element
 * - `flight` (one or more) — RSC Flight payload rows
 * - `done` — signals the end of the payload
 *
 * Call this from a route handler to expose a Flight payload for federation.
 * The returned Response has the correct content-type and CORS headers.
 */
export async function encodeFederationPayload(value: unknown): Promise<Response> {
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of encodeFederationPayloadEvents({ value })) {
          const data = (() => {
            switch (event.type) {
              case 'metadata':
                return JSON.stringify(event.payload)
              case 'ssr':
                return JSON.stringify({ html: event.payload })
              case 'flight':
                return event.payload
              case 'done':
                return ''
            }
          })()
          controller.enqueue(
            encoder.encode(formatSSEEvent(event.type, data)),
          )
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*',
    },
  })
}

export const renderFlightPayload = encodeFederationPayload
export const renderComponentPayload = encodeFederationPayload
