// RSC URL helpers and flight response utilities.

export function stripRscUrl(url: URL) {
  const next = new URL(url.href)
  if (next.pathname.endsWith('/index.rsc')) {
    next.pathname = next.pathname.slice(0, -9)
  } else if (next.pathname.endsWith('.rsc')) {
    next.pathname = next.pathname.slice(0, -4)
  }
  next.searchParams.delete('__rsc')
  return next
}

export function getDocumentPath(url: URL) {
  const next = stripRscUrl(url)
  return `${next.pathname}${next.search}${next.hash}`
}

export function getDocumentLocationFromResponse(args: {
  response: Response
  requestUrl: URL
}) {
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

export function isDocumentRequest(request: Request) {
  return request.headers.get('sec-fetch-dest') === 'document'
}

export function isRscRequest(url: URL) {
  return url.pathname.endsWith('.rsc') || url.searchParams.has('__rsc')
}

export function isFlightResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  return contentType.startsWith('text/x-component')
}
