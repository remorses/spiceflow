'use client'
import React from 'react'
import ReactDOMServer from 'react-dom/server'

const VALID_TAGS = new Set(['title', 'meta', 'link', 'base', 'style', 'script'])

export class MetaState {
  private tags: React.ReactElement[] = []
  private counter: number = 0

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
      const key = this.getTagKey(tag)
      tagMap.set(key, ReactDOMServer.renderToStaticMarkup(tag))
    })

    return Array.from(tagMap.values()).join('')
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

const MetaContext = React.createContext<MetaState | null>(null)

export const MetaProvider = ({
  metaState,
  children,
}: {
  metaState: MetaState
  children: React.ReactNode
}) => {
  return (
    <MetaContext.Provider value={metaState}>{children}</MetaContext.Provider>
  )
}

export const Meta = ({ children }) => {
  if (typeof window !== 'undefined') {
    return children
  }
  const metaState = React.useContext(MetaContext)
  if (!metaState) throw new Error('Meta must be used within MetaProvider')

  if (typeof window === 'undefined') {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && VALID_TAGS.has(child.type as string)) {
        metaState.addTag(child)
      }
    })
  }

  return null
}
