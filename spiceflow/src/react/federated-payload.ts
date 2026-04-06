import React from 'react'
import ReactDOM from 'react-dom'
import { streamSSEResponse, type SSEEvent } from '../client/shared.js'
import { EsmIsland } from './esm-island.js'
import { RemoteIsland } from './remote-island.js'

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

export interface DecodedFederationPayloadResult<T = unknown> {
  value: T
  ssrHtml: string
  metadata: FederatedPayloadMetadata
  remoteOrigin: string
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

export async function* parseFederationPayload(
  response: Response,
): AsyncGenerator<FederationPayloadEvent> {
  if (!response.ok) {
    throw new Error(
      `[decodeFederationPayload] Failed to read payload: ${response.status}`,
    )
  }

  const remoteOrigin = getResponseOrigin(response)

  for await (const event of streamSSEResponse({
    response,
    map: (x: SSEEvent) => x,
  })) {
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
}

async function collectFederationPayload(
  response: Response,
): Promise<ParsedFederatedFlightPayload> {
  let metadata: FederatedPayloadMetadata | null = null
  let ssrHtml = ''
  let remoteOrigin = ''
  const flightRows: string[] = []

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
        flightRows.push(event.payload)
        break
    }
  }

  if (!metadata) {
    throw new Error('[decodeFederationPayload] No metadata event in response')
  }

  return {
    metadata,
    ssrHtml,
    flightPayload: flightRows.length > 0 ? flightRows.join('\n') + '\n' : '',
    remoteOrigin,
  }
}

const remoteRegistry = new Map<string, Record<string, unknown>>()

let requirePatched = false

function ensureRequirePatched() {
  if (requirePatched) return
  requirePatched = true
  const g = globalThis as {
    __vite_rsc_client_require__?: (id: string) => unknown
  }
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
      const mod = (await import(
        /* @vite-ignore */ chunkUrl
      )) as Record<string, unknown>
      const exportName = 'export_' + moduleId
      const exported = mod[exportName]
      if (exported && typeof exported === 'object') {
        remoteRegistry.set(moduleId, exported as Record<string, unknown>)
        continue
      }
      remoteRegistry.set(moduleId, mod)
    }
  }
}

async function getFlightClientBrowser() {
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
          return globalDecoder<T>(response.body) as PromiseLike<T>
        })
      },
    }
  }

  const rsc = await import('@vitejs/plugin-rsc/browser')
  return {
    createFromReadableStream: rsc.createFromReadableStream as <T>(
      stream: ReadableStream<Uint8Array>,
    ) => PromiseLike<T>,
    createFromFetch: rsc.createFromFetch as <T>(
      response: Promise<Response>,
    ) => PromiseLike<T>,
  }
}

export async function decodeParsedFederationPayload<T = unknown>(
  parsed: ParsedFederatedFlightPayload,
): Promise<DecodedFederationPayloadResult<T>> {
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
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(parsed.flightPayload))
      controller.close()
    },
  })

  const value = await (createFromFetch<T>(
    Promise.resolve(
      new Response(stream, {
        headers: {
          'content-type': 'text/x-component;charset=utf-8',
        },
      }),
    ),
  ) as PromiseLike<T>)

  return {
    value,
    ssrHtml: parsed.ssrHtml,
    metadata: parsed.metadata,
    remoteOrigin: parsed.remoteOrigin,
  }
}

export async function decodeFederationPayload<T = unknown>(
  response: Response,
): Promise<DecodedFederationPayloadResult<T>> {
  if (typeof window === 'undefined') {
    throw new Error(
      '[decodeFederationPayload] This API is only available in the browser',
    )
  }

  const events = parseFederationPayload(response)

  const metadataEvent = await events.next()
  if (metadataEvent.done || metadataEvent.value.type !== 'metadata') {
    throw new Error('[decodeFederationPayload] No metadata event in response')
  }

  const { payload: metadata, remoteOrigin } = metadataEvent.value

  const ssrEvent = await events.next()
  const ssrHtml =
    ssrEvent.done || ssrEvent.value.type !== 'ssr' ? '' : ssrEvent.value.payload

  await loadFederatedClientModules({
    clientModules: metadata.clientModules,
    remoteOrigin,
  })

  ensureRequirePatched()

  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined
  const flightStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
    },
  })

  const pump = (async () => {
    if (!ssrEvent.done && ssrEvent.value.type === 'flight') {
      controllerRef?.enqueue(new TextEncoder().encode(ssrEvent.value.payload + '\n'))
    }

    for await (const event of events) {
      if (event.type === 'flight') {
        controllerRef?.enqueue(new TextEncoder().encode(event.payload + '\n'))
        continue
      }
      if (event.type === 'done') {
        break
      }
    }

    controllerRef?.close()
  })().catch((error) => {
    controllerRef?.error(error)
  })

  const { createFromFetch } = await getFlightClientBrowser()
  const value = await (createFromFetch<T>(
    Promise.resolve(
      new Response(flightStream, {
        headers: {
          'content-type': 'text/x-component;charset=utf-8',
        },
      }),
    ),
  ) as PromiseLike<T>)

  void pump

  return {
    value,
    ssrHtml,
    metadata,
    remoteOrigin,
  }
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
