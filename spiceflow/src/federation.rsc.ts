// Federation RSC entry point. Renders a Flight-serializable value to an SSE
// response containing metadata, optional SSR HTML, and streamed Flight rows.
// Reader aborts are wired through so cancelling the outer response also stops
// the underlying Flight stream instead of leaving it pending in the background.
import React from 'react'
import { renderToReadableStream } from '#rsc-runtime'
import { bindAbortToReader } from './client/shared.js'
import { getBasePath } from './base-path.js'

export { renderToReadableStream }

const encoder = new TextEncoder()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function streamToString({
  stream,
  signal,
}: {
  stream: ReadableStream<Uint8Array>
  signal?: AbortSignal
}): Promise<string> {
  const reader = stream.getReader()
  const unbindAbort = bindAbortToReader({ reader, signal })
  const decoder = new TextDecoder()
  let result = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
    }
    result += decoder.decode()
    return result
  } finally {
    unbindAbort()
    reader.releaseLock()
  }
}

async function streamToChunks({
  stream,
  signal,
}: {
  stream: ReadableStream<Uint8Array>
  signal?: AbortSignal
}) {
  const reader = stream.getReader()
  const unbindAbort = bindAbortToReader({ reader, signal })
  const chunks: Uint8Array[] = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return chunks
  } finally {
    unbindAbort()
    reader.releaseLock()
  }
}

async function renderFlightStreamToHtml({
  stream,
  signal,
}: {
  stream: ReadableStream<Uint8Array>
  signal?: AbortSignal
}) {
  const flightPayload = await streamToString({ stream, signal })
  const ssrModule = await import.meta.viteRsc.loadModule<
    typeof import('./react/entry.ssr.js')
  >('ssr', 'index')
  return await ssrModule.renderFlightToHtml(flightPayload)
}

export async function renderToStaticMarkup(value: React.ReactNode) {
  return await renderFlightStreamToHtml({
    stream: renderToReadableStream(value),
  })
}

function formatSSEEvent(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`
}

async function* streamFlightChunks(
  {
    stream,
    signal,
  }: {
    stream: ReadableStream<Uint8Array>
    signal?: AbortSignal
  },
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader()
  const unbindAbort = bindAbortToReader({ reader, signal })
  let finished = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        finished = true
        break
      }

      yield value
    }
  } finally {
    unbindAbort()
    if (!finished) {
      await reader.cancel().catch(() => undefined)
    }
    reader.releaseLock()
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

function withBase(path: string): string {
  const base = getBasePath()
  if (!base || !path.startsWith('/')) return path
  if (path === base) return path
  const next = path.charAt(base.length)
  if (path.startsWith(base) && (next === '/' || next === '?' || next === '#')) {
    return path
  }
  return base + path
}

async function* encodeFederationPayloadEvents({
  value,
  signal,
}: {
  value: unknown
  signal?: AbortSignal
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
          cssLinksSet.add(withBase(css))
        }

        const chunks = metadata.deps.js.length > 0
          ? metadata.deps.js
              .filter((js) => js.includes('user-components'))
              .map(withBase)
          : [withBase(metadata.id)]
        if (chunks.length > 0) {
          clientModules[metadata.id] = {
            chunks,
            css: metadata.deps.css.map(withBase),
          }
        }
      },
    },
  )

  if (React.isValidElement(value)) {
    const flightChunks = await streamToChunks({
      stream: flightStream,
      signal,
    })
    let ssrHtml = ''
    try {
      const ssrModule = await import.meta.viteRsc.loadModule<
        typeof import('./react/entry.ssr.js')
      >('ssr', 'index')
      ssrHtml = await ssrModule.renderFlightToHtml(flightChunks)
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

    for (const chunk of flightChunks) {
      yield { type: 'flight', payload: bytesToBase64(chunk) }
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

  for await (const chunk of streamFlightChunks({
    stream: flightStream,
    signal,
  })) {
    yield { type: 'flight', payload: bytesToBase64(chunk) }
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
  const abortController = new AbortController()
  const iterator = encodeFederationPayloadEvents({
    value,
    signal: abortController.signal,
  })[Symbol.asyncIterator]()
  let closed = false

  const cleanup = async () => {
    if (closed) return
    closed = true
    abortController.abort()
    if (!iterator.return) return
    await iterator.return(undefined).catch(() => undefined)
  }

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (closed) {
        controller.close()
        return
      }

      try {
        const next = await iterator.next()
        if (next.done) {
          await cleanup()
          controller.close()
          return
        }

        const data = (() => {
          switch (next.value.type) {
            case 'metadata':
              return JSON.stringify(next.value.payload)
            case 'ssr':
              return JSON.stringify({ html: next.value.payload })
            case 'flight':
              return next.value.payload
            case 'done':
              return ''
          }
        })()

        controller.enqueue(
          encoder.encode(formatSSEEvent(next.value.type, data)),
        )
      } catch (error) {
        await cleanup()
        controller.error(error)
      }
    },
    async cancel() {
      await cleanup()
    },
  })

  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'content-encoding': 'none',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*',
    },
  })
}

export const renderFlightPayload = encodeFederationPayload
export const renderComponentPayload = encodeFederationPayload
