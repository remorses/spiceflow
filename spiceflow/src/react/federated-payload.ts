import React from 'react'
import ReactDOM from 'react-dom'
import { EventSourceParserStream } from 'eventsource-parser/stream'
import { EsmIsland } from './esm-island.js'
import { RemoteIsland } from './remote-island.js'

const encoder = new TextEncoder()

function parseFlightChunk(value: string): string {
  const chunk = JSON.parse(value) as unknown
  if (typeof chunk !== 'string') {
    throw new Error('[decodeFederationPayload] Invalid flight chunk')
  }
  return chunk
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
    flightPayload: flightChunks.map(parseFlightChunk).join(''),
    flightChunks,
    remoteOrigin,
  }
}

const remoteRegistry = new Map<string, Record<string, unknown>>()

let requirePatched = false

function ensureRequirePatched() {
  if (requirePatched) return
  requirePatched = true
  const g = globalThis as typeof globalThis & {
    __vite_rsc_client_require__?: (id: string) => unknown
    __webpack_require__?: (id: string) => unknown
    __federation_require__?: (id: string) => unknown
  }
  const orig = g.__vite_rsc_client_require__
  if (orig) {
    // Vite RSC host: patch the existing require to check remoteRegistry first
    g.__vite_rsc_client_require__ = (id: string) => {
      const cleanId = id.split('$$cache=')[0]
      const mod = remoteRegistry.get(cleanId)
      if (mod) return mod
      return orig(id)
    }
  } else {
    // Standalone (no Vite RSC host): set up require globals so that
    // react-server-dom-webpack's Flight client can resolve remote modules.
    // Covers both the original __webpack_require__ and any renamed variants
    // (e.g. __federation_require__ used by standalone consumers that patch
    // react-server-dom-webpack to avoid conflicts with real webpack apps).
    const standaloneRequire = (id: string) => {
      const cleanId = id.split('$$cache=')[0]
      const mod = remoteRegistry.get(cleanId)
      if (mod) return mod
      throw new Error(`[federation] Module not found in remote registry: ${id}`)
    }
    g.__vite_rsc_client_require__ = standaloneRequire
    g.__webpack_require__ = standaloneRequire
    g.__federation_require__ = standaloneRequire
  }
}

export async function loadFederatedClientModules({
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

// Allow external consumers (non-Vite-RSC apps) to inject a Flight client
// so decodeFederationPayload works without @vitejs/plugin-rsc/browser.
let overrideFlightClient: FlightClientBrowser | null = null

export function setFederationFlightClient(client: FlightClientBrowser) {
  overrideFlightClient = client
}

async function getFlightClientBrowser(): Promise<FlightClientBrowser> {
  if (overrideFlightClient) {
    return overrideFlightClient
  }

  const globalDecoder = globalThis.__spiceflow_createFromReadableStream
  if (globalDecoder) {
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

  throw new Error(
    '[federation] No Flight client available. In a standalone consumer, ' +
      'call setupFederationConsumer() before decoding federation payloads. ' +
      'In a Vite RSC host, the global decoder is set automatically by entry.client.',
  )
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
    ? parsed.flightChunks.map((chunk) => encoder.encode(parseFlightChunk(chunk)))
    : [encoder.encode(parsed.flightPayload)]

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

export async function decodeFederationPayloadDetails<T = unknown>(
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
        return encoder.encode(parseFlightChunk(chunk))
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

// ---------------------------------------------------------------------------
// Standalone federation consumer setup
// ---------------------------------------------------------------------------
// Sets up everything needed for a non-Vite-RSC app (plain React SPA, Next.js,
// etc.) to consume federation payloads from a remote spiceflow server.
//
// Three things happen:
// 1. Module globals: stores the host's React/ReactDOM module namespaces on a
//    global so that blob-URL wrapper modules can re-export them. This ensures
//    remote federation chunks (loaded via dynamic import) share the same React
//    instance as the host app.
// 2. Import map: injects a <script type="importmap"> with blob URLs that map
//    bare specifiers ("react", "react-dom", etc.) to wrapper modules that read
//    from the global. Requires browser support for multiple import maps
//    (Chrome 133+, Firefox 136+, Safari 18.4+).
// 3. Flight client: wraps react-server-dom-webpack's createFromReadableStream
//    and createFromFetch so decodeFederationPayload works without
//    @vitejs/plugin-rsc/browser.

const GLOBAL_KEY = '__SPICEFLOW_FEDERATION__'

interface FederationConsumerOptions {
  // The react-server-dom-webpack/client.browser module. Must provide
  // createFromReadableStream and createFromFetch.
  reactServerDomWebpack: {
    createFromReadableStream: (
      stream: ReadableStream<Uint8Array>,
      options?: any,
    ) => PromiseLike<any>
    createFromFetch: (
      response: Promise<Response>,
      options?: any,
    ) => PromiseLike<any>
  }
  // Map of bare specifiers to their module namespace objects. The host app
  // must pass its own bundled React modules so remote chunks use the same
  // instance. Typical entries:
  //   'react': import * as React from 'react'
  //   'react/jsx-runtime': import * as JsxRuntime from 'react/jsx-runtime'
  //   'react-dom': import * as ReactDOM from 'react-dom'
  //   'react-dom/client': import * as ReactDOMClient from 'react-dom/client'
  modules: Record<string, Record<string, unknown>>
}

export function setupFederationConsumer(options: FederationConsumerOptions) {
  const { reactServerDomWebpack, modules } = options
  const g = globalThis as any

  // SSR guard: blob URLs and import maps are browser-only. On the server
  // we just wire up the Flight client so decodeFederationPayload can work
  // in Node (e.g. Next.js API routes), but skip DOM-dependent setup.
  if (typeof document === 'undefined') {
    const callServer = () => {
      throw new Error(
        'Server actions are not supported in standalone federation consumers',
      )
    }
    setFederationFlightClient({
      createFromReadableStream<T>(stream: ReadableStream<Uint8Array>) {
        return reactServerDomWebpack.createFromReadableStream(stream, {
          callServer,
        })
      },
      createFromFetch<T>(response: Promise<Response>) {
        return reactServerDomWebpack.createFromFetch(response, { callServer })
      },
    })
    return
  }

  // Idempotent: skip if already set up with the same modules to avoid
  // leaking blob URLs and duplicate import maps (React Strict Mode, HMR).
  if (g[GLOBAL_KEY]) return

  // 1. Store modules on global for blob URL wrappers to read
  g[GLOBAL_KEY] = modules

  // 2. Create blob URL wrapper modules and inject import map
  const imports: Record<string, string> = {}
  for (const [specifier, mod] of Object.entries(modules)) {
    const keys = Object.keys(mod).filter(
      (k) => k !== '__esModule' && k !== 'default',
    )
    const ref = `globalThis[${JSON.stringify(GLOBAL_KEY)}][${JSON.stringify(specifier)}]`
    const lines = [
      `const __m = ${ref};`,
      ...keys.map((k) => `export const ${k} = __m[${JSON.stringify(k)}];`),
      `export default __m.default !== undefined ? __m.default : __m;`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/javascript' })
    imports[specifier] = URL.createObjectURL(blob)
  }

  const script = document.createElement('script')
  script.type = 'importmap'
  script.textContent = JSON.stringify({ imports })
  document.head.appendChild(script)

  // 3. Set up Flight client
  const callServer = () => {
    throw new Error(
      'Server actions are not supported in standalone federation consumers',
    )
  }
  setFederationFlightClient({
    createFromReadableStream<T>(stream: ReadableStream<Uint8Array>) {
      return reactServerDomWebpack.createFromReadableStream(stream, {
        callServer,
      })
    },
    createFromFetch<T>(response: Promise<Response>) {
      return reactServerDomWebpack.createFromFetch(response, { callServer })
    },
  })

  // 4. Patch require globals for standalone mode
  ensureRequirePatched()
}

// Vite plugin for standalone federation consumers. Two responsibilities:
// 1. In dev mode, transforms react-server-dom-webpack source to rename
//    __webpack_require__ so it doesn't crash outside a real webpack build.
// 2. In all modes, injects a <script> into the HTML that stubs
//    __webpack_require__ as a global. This covers the case where
//    react-server-dom-webpack is externalized (e.g. loaded from esm.sh)
//    and the transform hook never sees it.
export function federationPatchWebpack() {
  return {
    name: 'spiceflow:federation-patch-webpack',
    transform(code: string, id: string) {
      if (!id.includes('react-server-dom-webpack')) return
      let patched = code
      if (patched.includes('__webpack_require__.u')) {
        patched = patched.replaceAll('__webpack_require__.u', '({}).u')
      }
      if (patched.includes('__webpack_require__')) {
        patched = patched.replaceAll(
          '__webpack_require__',
          '__federation_require__',
        )
      }
      if (patched !== code) return { code: patched, map: null }
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: [
            `if (!globalThis.__webpack_require__) {`,
            `  globalThis.__webpack_require__ = function(id) {`,
            `    throw new Error('[federation] Module not found: ' + id);`,
            `  };`,
            `  globalThis.__webpack_require__.u = undefined;`,
            `}`,
          ].join('\n'),
          injectTo: 'head-prepend' as const,
        },
      ]
    },
  }
}
