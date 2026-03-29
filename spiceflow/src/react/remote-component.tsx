import { RemoteIsland } from './remote-island.js'

export async function RemoteComponent({
  src,
  ...props
}: {
  src: string
  [key: string]: unknown
}) {
  const url = new URL(src)
  for (const [k, v] of Object.entries(props)) {
    if (k !== 'src') url.searchParams.set(k, String(v))
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`[spiceflow] Failed to fetch remote component from ${url}: ${response.status}`)
  }

  const data = await response.json()

  return (
    <RemoteIsland
      flightPayload={data.flightPayload}
      remoteOrigin={url.origin}
      remoteId={data.remoteId}
      clientModules={data.clientModules || {}}
    />
  )
}
