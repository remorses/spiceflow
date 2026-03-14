import ReactDOMServer from 'react-dom/server'
import React from 'react'

type MetaStateOptions = {
  baseUrl?: string
}

type LinkRel = 'alternate' | 'apple-touch-icon' | 'canonical' | 'icon' | 'manifest'

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

export class MetaState {
  private tags: React.ReactElement[] = []
  private counter: number = 0
  private baseUrl?: string

  constructor({ baseUrl }: MetaStateOptions = {}) {
    this.baseUrl = baseUrl
  }

  addTag(tag: React.ReactElement) {
    this.tags.push(tag)
  }

  incrementCounter() {
    this.counter += 1
    return this.counter
  }

  getTags() {
    return this.tags
  }

  getProcessedTags() {
    const tagMap = new Map()

    this.tags.forEach((tag) => {
      const processedTag = this.processTag(tag)
      const key = this.getTagKey(processedTag)
      tagMap.set(key, ReactDOMServer.renderToStaticMarkup(processedTag))
    })

    return Array.from(tagMap.values()).join('')
  }

  private processTag(tag: React.ReactElement): React.ReactElement {
    if (!this.baseUrl) return tag

    if (tag.type === 'meta') {
      const props = { ...(tag.props || undefined) } as Record<string, string>
      const identity = this.getMetaIdentity(props)
      if (identity && URL_META_PROPS.has(identity.value) && props.content?.startsWith('/')) {
        props.content = this.baseUrl + props.content
      }
      return React.cloneElement(tag, props)
    }

    return tag
  }

  private getTagKey(tag: React.ReactElement) {
    if (tag.type === 'meta') {
      return this.getMetaKey(tag)
    }

    if (tag.type === 'title') {
      return 'title'
    }

    if (tag.type === 'base') {
      return 'base'
    }

    if (tag.type === 'link') {
      return this.getLinkKey(tag)
    }

    return `${tag.type}:${this.incrementCounter()}`
  }

  private getMetaKey(tag: React.ReactElement) {
    const props = (tag.props || {}) as Record<string, string>
    const identity = this.getMetaIdentity(props)

    if (!identity) {
      return `meta:${this.incrementCounter()}`
    }

    return `meta:${identity.kind}:${identity.value}`
  }

  private getMetaIdentity(props: Record<string, string>) {
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

  private getLinkKey(tag: React.ReactElement) {
    const props = (tag.props || {}) as Record<string, string>
    const rel = props.rel as LinkRel | undefined

    if (!rel || !DEDUPED_LINK_RELS.has(rel)) {
      return `link:${this.incrementCounter()}`
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
}
