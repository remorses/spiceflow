// Navigation helpers for robust client-side link interception and RSC URL rewriting.

export interface LinkClickState {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export interface LinkNavigationInfo {
  nextUrl: URL
  replace: boolean
}

export interface LinkNavigationRequest {
  href: string
  replace?: boolean
  reloadDocument?: boolean
}

export function shouldProcessLinkClick({
  click,
  target,
  defaultPrevented,
}: {
  click: LinkClickState
  target?: string | null
  defaultPrevented?: boolean
}) {
  if (defaultPrevented) return false
  if (click.button !== 0) return false
  if (!target || target === '_self') {
    return !isModifiedClick({ click })
  }
  if (target.toLowerCase() !== '_self') {
    return false
  }

  return !isModifiedClick({ click })
}

export function getLinkNavigationInfo({
  link,
  currentUrl,
}: {
  link: LinkNavigationRequest
  currentUrl: URL
}): LinkNavigationInfo | null {
  if (link.reloadDocument) return null

  const nextUrl = resolveHref({ href: link.href, currentUrl })
  if (!nextUrl) return null
  if (!isHttpUrl({ url: nextUrl })) return null
  if (nextUrl.origin !== currentUrl.origin) return null

  const replace =
    link.replace ?? isSameUrl({ currentUrl, nextUrl })

  return {
    nextUrl,
    replace,
  }
}

export function isHashOnlyNavigation({
  currentUrl,
  nextUrl,
}: {
  currentUrl: URL
  nextUrl: URL
}) {
  if (nextUrl.hash.length === 0) return false

  const samePath = nextUrl.pathname === currentUrl.pathname
  const sameSearch = nextUrl.search === currentUrl.search
  const differentHash = nextUrl.hash !== currentUrl.hash

  return samePath && sameSearch && differentHash
}

export function isSamePathAndSearch({
  currentUrl,
  nextUrl,
}: {
  currentUrl: URL
  nextUrl: URL
}) {
  return (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search === nextUrl.search
  )
}

export function scrollToHash({ hash }: { hash: string }) {
  if (!hash) return false

  const id = decodeHash({ hash })
  if (!id) return false
  const element = document.getElementById(id)
  if (!element) return false
  element.scrollIntoView()
  return true
}

export function getNavigationUrl({
  location,
}: {
  location: { pathname: string; search: string; hash: string }
}) {
  return new URL(
    location.pathname + location.search + location.hash,
    window.location.origin,
  )
}

export function isSameUrl({
  currentUrl,
  nextUrl,
}: {
  currentUrl: URL
  nextUrl: URL
}) {
  return (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search === nextUrl.search &&
    currentUrl.hash === nextUrl.hash
  )
}

function decodeHash({ hash }: { hash: string }) {
  const trimmed = hash.slice(1)
  if (!trimmed) return

  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

function resolveHref({ href, currentUrl }: { href: string; currentUrl: URL }) {
  try {
    return new URL(href, currentUrl)
  } catch {
    return null
  }
}

function isModifiedClick({ click }: { click: LinkClickState }) {
  return !!(click.metaKey || click.ctrlKey || click.shiftKey || click.altKey)
}

export function toRscUrl({ url }: { url: URL }) {
  const rscUrl = new URL(url.href)
  rscUrl.pathname = toRscPathname({ pathname: rscUrl.pathname })
  rscUrl.searchParams.set('__rsc', '')
  rscUrl.hash = ''
  return rscUrl
}

export function toRscPathname({ pathname }: { pathname: string }) {
  if (pathname.endsWith('.rsc')) return pathname
  if (pathname === '/') return '/.rsc'

  const normalizedPathname = pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

  return `${normalizedPathname}.rsc`
}

export function isFlightResponse({ response }: { response: Response }) {
  const contentType = response.headers.get('content-type')
  return contentType?.startsWith('text/x-component') || false
}

function isHttpUrl({ url }: { url: URL }) {
  return url.protocol === 'http:' || url.protocol === 'https:'
}
