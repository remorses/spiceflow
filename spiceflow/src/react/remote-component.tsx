import ReactDOM from 'react-dom'
import { RemoteIsland } from './remote-island.js'

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
    throw new Error(`[spiceflow] Failed to fetch remote component from ${url}: ${response.status}`)
  }

  const data = await response.json()

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
