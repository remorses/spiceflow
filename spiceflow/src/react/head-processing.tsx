import React from 'react'

type LinkRel =
  | 'alternate'
  | 'apple-touch-icon'
  | 'canonical'
  | 'icon'
  | 'manifest'

const URL_META_PROPS = new Set([
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'og:url',
  'twitter:image',
  'twitter:image:src',
])

const DEDUPED_LINK_RELS = new Set<LinkRel>([
  'alternate',
  'apple-touch-icon',
  'canonical',
  'icon',
  'manifest',
])

export function getProcessedHeadTagElements({
  tags,
  baseUrl,
}: {
  tags: React.ReactElement[]
  baseUrl?: string
}) {
  let counter = 0
  const incrementCounter = () => {
    counter += 1
    return counter
  }

  const tagMap = new Map<string, React.ReactElement>()

  tags.forEach((tag) => {
    const processedTag = processTag({ tag, baseUrl })
    const key = getTagKey({ tag: processedTag, incrementCounter })
    tagMap.set(key, processedTag)
  })

  return Array.from(tagMap.entries()).map(([key, tag]) =>
    React.cloneElement(tag, { key }),
  )
}

function processTag({
  tag,
  baseUrl,
}: {
  tag: React.ReactElement
  baseUrl?: string
}) {
  if (!baseUrl || tag.type !== 'meta') {
    return tag
  }

  const props = { ...(tag.props || undefined) } as Record<string, string>
  const identity = getMetaIdentity(props)
  if (
    identity &&
    URL_META_PROPS.has(identity.value) &&
    props.content?.startsWith('/')
  ) {
    props.content = baseUrl + props.content
  }

  return React.cloneElement(tag, props)
}

function getTagKey({
  tag,
  incrementCounter,
}: {
  tag: React.ReactElement
  incrementCounter: () => number
}) {
  if (tag.type === 'meta') {
    const props = (tag.props || {}) as Record<string, string>
    const identity = getMetaIdentity(props)

    if (!identity) {
      return `meta:${incrementCounter()}`
    }

    return `meta:${identity.kind}:${identity.value}`
  }

  if (tag.type === 'title') {
    return 'title'
  }

  if (tag.type === 'base') {
    return 'base'
  }

  if (tag.type === 'link') {
    return getLinkKey({
      tag,
      incrementCounter,
    })
  }

  return `${tag.type}:${incrementCounter()}`
}

function getMetaIdentity(props: Record<string, string>) {
  if (typeof props.charSet === 'string') {
    return { kind: 'charSet', value: 'charSet' }
  }

  if (typeof props.name === 'string') {
    return { kind: 'name', value: props.name }
  }

  if (typeof props.property === 'string') {
    return { kind: 'property', value: props.property }
  }

  if (typeof props.httpEquiv === 'string') {
    return { kind: 'httpEquiv', value: props.httpEquiv }
  }

  return null
}

function getLinkKey({
  tag,
  incrementCounter,
}: {
  tag: React.ReactElement
  incrementCounter: () => number
}) {
  const props = (tag.props || {}) as Record<string, string>
  const rel = props.rel as LinkRel | undefined

  if (!rel || !DEDUPED_LINK_RELS.has(rel)) {
    return `link:${incrementCounter()}`
  }

  if (rel === 'alternate') {
    const hrefLang = props.hrefLang ?? ''
    const type = props.type ?? ''
    return `link:${rel}:${hrefLang}:${type}`
  }

  const sizes = props.sizes ?? ''
  const type = props.type ?? ''
  return `link:${rel}:${sizes}:${type}`
}
