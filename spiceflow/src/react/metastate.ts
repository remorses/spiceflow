import ReactDOMServer from 'react-dom/server'
import React from 'react'
export class MetaState {
  private tags: React.ReactElement[] = []
  private counter: number = 0
  private baseUrl?: string

  constructor({ baseUrl }) {
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
      // Handle og:image, twitter:image etc
      if (props.content?.startsWith('/')) {
        props.content = this.baseUrl + props.content
      }
      return React.cloneElement(tag, props)
    }

    return tag
  }

  private getTagKey(tag: React.ReactElement) {
    if (tag.type === 'meta') {
      // For meta tags, use all properties to create a robust key
      const props = Object.entries(tag.props || {})
        .sort(([a], [b]) => a.localeCompare(b)) // Sort properties for consistency
        .map(([key, value]) => `${key}:${value}`)
        .join('|')
      return `meta:${props}`
    } else if (tag.type === 'title') {
      // For title tags, use a fixed key since there should only be one
      return 'title'
    } else {
      // For other tags, use an incremented number for faster key generation
      return `${tag.type}:${this.incrementCounter()}`
    }
  }
}
