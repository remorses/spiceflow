import React from 'react'
import ReactDOM from 'react-dom'
import { EventSourceParserStream } from 'eventsource-parser/stream'
import { EsmIsland } from './esm-island.js'
import { RemoteIsland } from './remote-island.js'

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export interface FederatedClientModuleInfo {
  chunks: string[]
  css: string[]
}

export interface FederatedPayloadMetadata {
  remoteId: string
  clientModules: Record<string, FederatedClientModuleInfo>
  cssLinks: string[]
}

export interface ParsedFederatedFlightPayload {
  metadata: FederatedPayloadMetadata
  ssrHtml: string
  flightPayload: string
  flightChunks?: string[]
  remoteOrigin: string
}

export type FederationPayloadEvent =
  | {
      type: 'metadata'
      payload: FederatedPayloadMetadata
      remoteOrigin: string
    }
  | { type: 'ssr'; payload: string }
  | { type: 'flight'; payload: string }
  | { type: 'done' }

interface DecodedFederationPayloadDetails<T = unknown> {
  value: T
  ssrHtml: string
  metadata: FederatedPayloadMetadata
  remoteOrigin: string
}

interface FlightClientBrowser {
  createFromReadableStream<T>(
    stream: ReadableStream<Uint8Array>,
  ): PromiseLike<T>
  createFromFetch<T>(response: Promise<Response>): PromiseLike<T>
}

export function isJavaScriptContentType(contentType: string): boolean {
  return (
    contentType.includes('javascript') ||
    contentType.includes('ecmascript')
  )
}

export function resolveFederatedUrl(path: string, origin: string): string {
  const absolute = (() => {
    try {
      return new URL(path).toString()
    } catch {
      return null
    }
  })()
  if (absolute) return absolute
  if (origin) return new URL(path, origin).toString()
  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).toString()
  }
  return path
}

function getResponseOrigin(response: Response): string {
  if (!response.url) return ''
  return new URL(response.url).origin
}

function getResponseContentType(response: Response): string {
  return (
    response.headers.get('content-type') ||
    response.headers.get('Content-Type') ||
    ''
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function* parseFederationPayload(
  response: Response,
  {
    signal,
  }: {
    signal?: AbortSignal
  } = {},
): AsyncGenerator<FederationPayloadEvent> {
  if (!response.ok) {
    throw new Error(
      `[decodeFederationPayload] Failed to read payload: ${response.status}`,
    )
  }

  const remoteOrigin = getResponseOrigin(response)

  const body = response.body
  if (!body) {
    return
  }

  const eventStream = body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
  const reader = eventStream.getReader()

  const abort = () => {
    void reader.cancel().catch(() => undefined)
  }

  if (signal) {
    if (signal.aborted) {
      abort()
      return
    }
    signal.addEventListener('abort', abort, { once: true })
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }

      const event = value
      if (!event) {
        continue
      }

      switch (event.event) {
        case 'metadata':
          yield {
            type: 'metadata',
            payload: JSON.parse(event.data) as FederatedPayloadMetadata,
            remoteOrigin,
          }
          break
        case 'ssr':
          yield {
            type: 'ssr',
            payload: JSON.parse(event.data).html as string,
          }
          break
        case 'flight':
          yield { type: 'flight', payload: event.data }
          break
        case 'done':
          yield { type: 'done' }
          break
      }
    }
  } finally {
    if (signal) {
      signal.removeEventListener('abort', abort)
    }
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

async function collectFederationPayload(
  response: Response,
): Promise<ParsedFederatedFlightPayload> {
  let metadata: FederatedPayloadMetadata | null = null
  let ssrHtml = ''
  let remoteOrigin = ''
  const flightChunks: string[] = []

  for await (const event of parseFederationPayload(response)) {
    switch (event.type) {
      case 'metadata':
        metadata = event.payload
        remoteOrigin = event.remoteOrigin
        break
      case 'ssr':
        ssrHtml = event.payload
        break
      case 'flight':
        flightChunks.push(event.payload)
        break
    }
  }

  if (!metadata) {
    throw new Error('[decodeFederationPayload] No metadata event in response')
  }

  return {
    metadata,
    ssrHtml,
    flightPayload: flightChunks.map((chunk) => new TextDecoder().decode(base64ToBytes(chunk))).join(''),
    flightChunks,
    remoteOrigin,
  }
}

const remoteRegistry = new Map<string, Record<string, unknown>>()

let requirePatched = false

function ensureRequirePatched() {
  if (requirePatched) return
  requirePatched = true
  const g: typeof globalThis & {
    __vite_rsc_client_require__?: (id: string) => unknown
  } = globalThis
  const orig = g.__vite_rsc_client_require__
  if (!orig) return
  g.__vite_rsc_client_require__ = (id: string) => {
    const cleanId = id.split('$$cache=')[0]
    const mod = remoteRegistry.get(cleanId)
    if (mod) return mod
    return orig(id)
  }
}

async function loadFederatedClientModules({
  clientModules,
  remoteOrigin,
}: {
  clientModules: Record<string, FederatedClientModuleInfo>
  remoteOrigin: string
}) {
  for (const [moduleId, info] of Object.entries(clientModules)) {
    for (const chunkPath of info.chunks) {
      const chunkUrl = resolveFederatedUrl(chunkPath, remoteOrigin)
      const mod: Record<string, unknown> = await import(
        /* @vite-ignore */ chunkUrl
      )
      const exportName = 'export_' + moduleId
      const exported = mod[exportName]
      if (isRecord(exported)) {
        remoteRegistry.set(moduleId, exported)
        continue
      }
      remoteRegistry.set(moduleId, mod)
    }
  }
}

async function getFlightClientBrowser(): Promise<FlightClientBrowser> {
  const globalDecoder = globalThis.__spiceflow_createFromReadableStream
  if (globalDecoder && typeof document === 'undefined') {
    return {
      createFromReadableStream: globalDecoder,
      createFromFetch: <T>(responsePromise: Promise<Response>) => {
        return Promise.resolve(responsePromise).then(async (response) => {
          if (!response.body) {
            throw new Error(
              '[decodeFederationPayload] Expected a response body for Flight decode',
            )
          }
          return globalDecoder<T>(response.body)
        })
      },
    }
  }

  const rsc = await import('@vitejs/plugin-rsc/browser')
  return {
    createFromReadableStream: rsc.createFromReadableStream,
    createFromFetch: rsc.createFromFetch,
  }
}

export async function decodeParsedFederationPayload<T = unknown>(
  parsed: ParsedFederatedFlightPayload,
): Promise<T> {
  if (typeof window === 'undefined') {
    throw new Error(
      '[decodeFederationPayload] This API is only available in the browser',
    )
  }

  await loadFederatedClientModules({
    clientModules: parsed.metadata.clientModules,
    remoteOrigin: parsed.remoteOrigin,
  })

  ensureRequirePatched()

  const { createFromFetch } = await getFlightClientBrowser()
  const chunks = parsed.flightChunks?.length
    ? parsed.flightChunks.map(base64ToBytes)
    : [new TextEncoder().encode(parsed.flightPayload)]

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })

  const value = await createFromFetch<T>(
    Promise.resolve(
      new Response(stream, {
        headers: {
          'content-type': 'text/x-component;charset=utf-8',
        },
      }),
    ),
  )

  return value
}

async function readFederationPrelude(
  response: Response,
  {
    signal,
  }: {
    signal?: AbortSignal
  } = {},
) {
  const events = parseFederationPayload(response, { signal })

  try {
    const metadataEvent = await events.next()
    if (metadataEvent.done || metadataEvent.value.type !== 'metadata') {
      throw new Error('[decodeFederationPayload] No metadata event in response')
    }

    const { payload: metadata, remoteOrigin } = metadataEvent.value

    const nextEvent = await events.next()
    const ssrHtml =
      nextEvent.done || nextEvent.value.type !== 'ssr' ? '' : nextEvent.value.payload

    return {
      events,
      metadata,
      remoteOrigin,
      nextEvent: nextEvent.done ? null : nextEvent.value,
      ssrHtml,
    }
  } catch (error) {
    await events.return(undefined).catch(() => undefined)
    throw error
  }
}

async function decodeFederationPayloadDetails<T = unknown>(
  response: Response,
): Promise<DecodedFederationPayloadDetails<T>> {
  if (typeof window === 'undefined') {
    throw new Error(
      '[decodeFederationPayload] This API is only available in the browser',
    )
  }

  const eventsAbortController = new AbortController()
  const { events, metadata, nextEvent, remoteOrigin, ssrHtml } =
    await readFederationPrelude(response, {
      signal: eventsAbortController.signal,
    })

  let eventsStopped = false
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined
  const stopEvents = async () => {
    if (eventsStopped) return
    eventsStopped = true
    eventsAbortController.abort()
    if (!events.return) return
    await events.return(undefined).catch(() => undefined)
  }
  const enqueueFlightChunk = (chunk: string) => {
    if (eventsStopped) return false

    const bytes = (() => {
      try {
        return base64ToBytes(chunk)
      } catch (error) {
        controllerRef?.error(error)
        throw error
      }
    })()

    try {
      controllerRef?.enqueue(bytes)
      return true
    } catch {
      return false
    }
  }

  try {
    await loadFederatedClientModules({
      clientModules: metadata.clientModules,
      remoteOrigin,
    })

    ensureRequirePatched()

    const flightStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller
      },
      async cancel() {
        await stopEvents()
      },
    })

    const pump = (async () => {
      if (nextEvent?.type === 'flight') {
        if (!enqueueFlightChunk(nextEvent.payload)) {
          await stopEvents()
          return
        }
      }

      for await (const event of events) {
        if (eventsStopped) return

        if (event.type === 'flight') {
          if (!enqueueFlightChunk(event.payload)) {
            await stopEvents()
            return
          }
          continue
        }
        if (event.type === 'done') {
          break
        }
      }

      if (eventsStopped) return

      try {
        controllerRef?.close()
      } catch {}
    })().catch(async (error) => {
      if (eventsStopped) return

      try {
        controllerRef?.error(error)
      } catch {}

      await stopEvents()
    })

    const { createFromFetch } = await getFlightClientBrowser()
    const value = await createFromFetch<T>(
      Promise.resolve(
        new Response(flightStream, {
          headers: {
            'content-type': 'text/x-component;charset=utf-8',
          },
        }),
      ),
    )

    void pump

    return {
      value,
      ssrHtml,
      metadata,
      remoteOrigin,
    }
  } catch (error) {
    await stopEvents()
    throw error
  }
}

export async function decodeFederationPayload<T = unknown>(
  response: Response,
): Promise<T> {
  const decoded = await decodeFederationPayloadDetails<T>(response)
  return decoded.value
}

export async function RenderFederatedPayload({
  response,
  isolateStyles,
}: {
  response: Response
  isolateStyles?: boolean
}) {
  const contentType = getResponseContentType(response)
  if (isJavaScriptContentType(contentType)) {
    const src = response.url
    return React.createElement(EsmIsland, { src })
  }

  const parsed = await collectFederationPayload(response)

  const cssLinks = parsed.metadata.cssLinks ?? []

  if (isolateStyles) {
    for (const cssHref of cssLinks) {
      ReactDOM.preload(resolveFederatedUrl(cssHref, parsed.remoteOrigin), {
        as: 'style',
      })
    }
  } else {
    for (const cssHref of cssLinks) {
      ReactDOM.preinit(resolveFederatedUrl(cssHref, parsed.remoteOrigin), {
        as: 'style',
        precedence: 'spiceflow-federation',
      })
    }
  }

  return React.createElement(RemoteIsland, { parsed, isolateStyles })
}
