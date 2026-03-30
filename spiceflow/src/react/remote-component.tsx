// Async server component that renders a remote component from a URL.
// Supports two modes based on the response content-type:
// - JSON (spiceflow federation): decodes Flight payload via RemoteIsland
// - JavaScript (ESM module): dynamically imports and renders via EsmIsland
import ReactDOM from 'react-dom'
import { EsmIsland } from './esm-island.js'
import { RemoteIsland } from './remote-island.js'

function isJavaScriptContentType(contentType: string): boolean {
  return (
    contentType.includes('javascript') ||
    contentType.includes('ecmascript')
  )
}

export async function RemoteComponent({
  src,
  props,
}: {
  src: string
  props?: Record<string, unknown>
}) {
  const url = new URL(src)
  if (props) {
    url.searchParams.set('props', JSON.stringify(props))
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(
      `[RemoteComponent] Failed to fetch from ${url}: ${response.status}`,
    )
  }

  const contentType = response.headers.get('content-type') || ''

  if (isJavaScriptContentType(contentType)) {
    return <EsmIsland src={url.toString()} props={props} />
  }

  const text = await response.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      `[RemoteComponent] Failed to parse JSON from ${url} (content-type: ${contentType}): ${text.slice(0, 300)}`,
    )
  }

  // Inject CSS links via React's preinit API so Fizz emits <link> tags
  // in the host's streamed HTML. Paths are already absolute when the
  // remote sets Vite base to its own URL.
  for (const cssHref of data.cssLinks ?? []) {
    const href = new URL(cssHref, url.origin).toString()
    ReactDOM.preinit(href, { as: 'style', precedence: 'spiceflow-federation' })
  }

  return (
    <RemoteIsland
      flightPayload={data.flightPayload}
      remoteOrigin={url.origin}
      remoteId={data.remoteId}
      clientModules={data.clientModules || {}}
      ssrHtml={data.ssrHtml || ''}
    />
  )
}
