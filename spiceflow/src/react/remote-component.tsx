// Async server component that renders a remote component from a URL.
// Supports two modes based on the response content-type:
// - SSE (spiceflow federation): parses metadata/ssr/flight events via RemoteIsland
// - JavaScript (ESM module): dynamically imports and renders via EsmIsland
import ReactDOM from 'react-dom'
import { streamSSEResponse, type SSEEvent } from '../client/shared.js'
import { EsmIsland } from './esm-island.js'
import { RemoteIsland } from './remote-island.js'

function isJavaScriptContentType(contentType: string): boolean {
  return (
    contentType.includes('javascript') ||
    contentType.includes('ecmascript')
  )
}

// Detect URLs that are likely ES modules from the path alone, so we can skip
// the server-side fetch entirely. Node.js can't import() remote URLs, and the
// fetch can crash the process if the browser disconnects mid-stream.
// Matches .js, .mjs, .jsx, .ts, .tsx — including Framer's .js@hash pattern.
function isLikelyEsmUrl(url: URL): boolean {
  return /\.(?:mjs|js|jsx|ts|tsx)(?:$|@)/i.test(url.pathname)
}

export async function RemoteComponent({
  src,
  props,
  isolateStyles,
  signal,
}: {
  src: string
  props?: Record<string, unknown>
  /** Render remote content inside a Shadow DOM to prevent CSS from leaking
   *  between host and remote. Uses Declarative Shadow DOM for SSR. */
  isolateStyles?: boolean
  /** Abort signal forwarded to the federation fetch. Pass `request.signal`
   *  so the fetch is cancelled when the browser disconnects. */
  signal?: AbortSignal
}) {
  const url = new URL(src)
  if (props) {
    url.searchParams.set('props', JSON.stringify(props))
  }

  if (isLikelyEsmUrl(url)) {
    return <EsmIsland src={url.toString()} props={props} />
  }

  const response = await fetch(url.toString(), { signal })
  if (!response.ok) {
    throw new Error(
      `[RemoteComponent] Failed to fetch from ${url}: ${response.status}`,
    )
  }

  const contentType = response.headers.get('content-type') || ''

  if (isJavaScriptContentType(contentType)) {
    return <EsmIsland src={url.toString()} props={props} />
  }

  let metadata: {
    remoteId: string
    clientModules: Record<string, { chunks: string[]; css: string[] }>
    cssLinks: string[]
  } | undefined
  let ssrHtml = ''
  const flightRows: string[] = []

  for await (const event of streamSSEResponse({ response, map: (x: SSEEvent) => x })) {
    switch (event.event) {
      case 'metadata':
        metadata = JSON.parse(event.data)
        break
      case 'ssr':
        ssrHtml = JSON.parse(event.data).html
        break
      case 'flight':
        flightRows.push(event.data)
        break
    }
  }

  if (!metadata) {
    throw new Error('[RemoteComponent] No metadata event in federation response')
  }

  // Reassemble Flight rows with newline delimiters — the Flight protocol
  // parser expects rows separated by \n.
  const flightPayload = flightRows.length > 0
    ? flightRows.join('\n') + '\n'
    : ''

  const cssLinks: string[] = metadata.cssLinks ?? []

  if (isolateStyles) {
    for (const cssHref of cssLinks) {
      const href = new URL(cssHref, url.origin).toString()
      ReactDOM.preload(href, { as: 'style' })
    }
  } else {
    for (const cssHref of cssLinks) {
      const href = new URL(cssHref, url.origin).toString()
      ReactDOM.preinit(href, { as: 'style', precedence: 'spiceflow-federation' })
    }
  }

  return (
    <RemoteIsland
      flightPayload={flightPayload}
      remoteOrigin={url.origin}
      remoteId={metadata.remoteId}
      clientModules={metadata.clientModules || {}}
      ssrHtml={ssrHtml || ''}
      cssLinks={cssLinks}
      isolateStyles={isolateStyles}
    />
  )
}
