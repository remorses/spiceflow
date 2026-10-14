// Cloudflare: serve staticPage() and staticGet() responses prerendered at build time.
// The files live in static assets under /cdn-cgi/, which visitors cannot reach,
// so the Worker always runs first and .use() middleware runs before them.
//
//   GET /about ─► Worker ─► middleware ─► manifest.json has /about ─► env.ASSETS: 3-html
//                                     └─► no entry, or no ASSETS binding ─► render live
import { env } from 'cloudflare:workers'
import { getDeploymentId, getPrerenderToken } from '#deployment-id'
import {
  PRERENDER_ASSETS_DIR,
  PRERENDER_TOKEN_HEADER,
  PRERENDERED_HEADER,
} from './deployment.js'
import type { PrerenderedManifest } from './prerendered.js'

type AssetsBinding = { fetch(input: string): Promise<Response> }

let manifestPromise: Promise<PrerenderedManifest | undefined> | undefined

export async function readPrerendered({
  request,
  path,
  rsc,
}: {
  request: Request
  path: string
  rsc: boolean
}): Promise<Response | undefined> {
  if (import.meta.hot) return undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined
  // Only this build's prerender step renders live
  const token = request.headers.get(PRERENDER_TOKEN_HEADER)
  if (token && token === (await getPrerenderToken())) return undefined
  const assets = env.ASSETS as AssetsBinding | undefined
  if (!assets) return undefined
  const deploymentId = await getDeploymentId()
  if (!deploymentId) return undefined

  manifestPromise ??= loadManifest({ assets, deploymentId })
  const entry = (await manifestPromise)?.routes[path.replace(/\/$/, '') || '/']
  const stored = entry?.body ?? (rsc ? entry?.rsc : entry?.html)
  if (!stored) return undefined

  const response = await assets.fetch(assetUrl(deploymentId, stored.file))
  if (!response.ok) {
    await response.body?.cancel()
    return undefined
  }
  const headers = new Headers({ [PRERENDERED_HEADER]: '1' })
  if (stored.contentType) headers.set('content-type', stored.contentType)
  return new Response(response.body, { headers })
}

async function loadManifest({
  assets,
  deploymentId,
}: {
  assets: AssetsBinding
  deploymentId: string
}): Promise<PrerenderedManifest | undefined> {
  try {
    const response = await assets.fetch(assetUrl(deploymentId, 'manifest.json'))
    if (!response.ok) {
      await response.body?.cancel()
      return undefined
    }
    return (await response.json()) as PrerenderedManifest
  } catch {
    // Render live now, and retry on the next request instead of caching a transient failure
    manifestPromise = undefined
    return undefined
  }
}

function assetUrl(deploymentId: string, file: string) {
  return `https://assets.local${PRERENDER_ASSETS_DIR}/${deploymentId}/${file}`
}
