// Deployment skew helpers for RSC navigations and actions.
// Keeps deployment id parsing, cookie serialization, and RSC URL normalization together.

export const deploymentCookieName = 'spiceflow-deployment'
export const deploymentReloadHeader = 'x-spiceflow-reload'
export const deploymentReasonHeader = 'x-spiceflow-reason'
export const deploymentMismatchStatus = 409

export function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) {
    return cookies
  }

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=')
    if (!rawKey) {
      continue
    }

    cookies[rawKey] = decodeURIComponent(rawValue.join('='))
  }

  return cookies
}

export function readDeploymentCookie(request: Request) {
  return parseCookies(request.headers.get('cookie'))[deploymentCookieName]
}

export function createDeploymentCookie(args: {
  deploymentId: string
  basePath?: string
}) {
  const path = args.basePath && args.basePath !== '' ? args.basePath : '/'
  return `${deploymentCookieName}=${encodeURIComponent(args.deploymentId)}; Path=${path}; HttpOnly; Secure; SameSite=Lax`
}

export function stripRscUrl(url: URL) {
  const next = new URL(url.href)
  next.searchParams.delete('__rsc')
  return next
}

export function getDocumentPath(url: URL) {
  const next = stripRscUrl(url)
  return `${next.pathname}${next.search}${next.hash}`
}

export function isDocumentRequest(request: Request) {
  return request.headers.get('sec-fetch-dest') === 'document'
}

export function isRscRequest(url: URL) {
  return url.searchParams.has('__rsc')
}

export function getDocumentLocationFromResponse(args: {
  response: Response
  requestUrl: URL
}) {
  const reloadLocation = args.response.headers.get(deploymentReloadHeader)
  if (reloadLocation) {
    return toSameOriginDocumentLocation({
      location: reloadLocation,
      requestUrl: args.requestUrl,
    })
  }

  if (args.response.redirected && args.response.url) {
    return toSameOriginDocumentLocation({
      location: args.response.url,
      requestUrl: args.requestUrl,
    })
  }

  return getDocumentPath(args.requestUrl)
}

function toSameOriginDocumentLocation(args: {
  location: string
  requestUrl: URL
}) {
  const fallbackLocation = getDocumentPath(args.requestUrl)

  try {
    const targetUrl = new URL(args.location, args.requestUrl)
    if (targetUrl.origin !== args.requestUrl.origin) {
      return fallbackLocation
    }
    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
  } catch {
    return fallbackLocation
  }
}

export function isFlightResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  return contentType.startsWith('text/x-component')
}

export function isDeploymentMismatchResponse(response: Response) {
  return (
    response.status === deploymentMismatchStatus &&
    response.headers.has(deploymentReloadHeader)
  )
}
