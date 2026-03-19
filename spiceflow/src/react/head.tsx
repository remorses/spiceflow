'use client'

import React from 'react'
import { MetaState } from './metastate.js'
import type {
  MetaProps,
  TitleProps,
  HeadLinkProps,
  ScriptProps,
  StyleProps,
  BaseProps,
} from './head-tags.js'

type HeadProps = {
  children?: React.ReactNode
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

function MetaComponent(props: MetaProps): React.JSX.Element {
  return <meta {...props} />
}

function TitleComponent({ children }: TitleProps): React.JSX.Element {
  return <title>{children}</title>
}

function LinkComponent(props: HeadLinkProps): React.JSX.Element {
  return <link {...props} />
}

function ScriptComponent(props: ScriptProps): React.JSX.Element {
  return <script {...props} />
}

function StyleComponent(props: StyleProps): React.JSX.Element {
  return <style {...props} />
}

function BaseComponent(props: BaseProps): React.JSX.Element {
  return <base {...props} />
}

// Map from sub-component function to the intrinsic tag name it renders
const TAG_MAP = new Map<Function, string>([
  [MetaComponent, 'meta'],
  [TitleComponent, 'title'],
  [LinkComponent, 'link'],
  [ScriptComponent, 'script'],
  [StyleComponent, 'style'],
  [BaseComponent, 'base'],
])

/**
 * Collects `<meta>`, `<title>`, `<link>`, `<base>`, `<style>`, and `<script>` tags
 * for server-side rendering. Tags are deduplicated across layouts and pages so the
 * innermost page can override metadata set by a parent layout.
 *
 * Always use `<Head>` to wrap head tags so they are properly deduplicated.
 * Use `Head.Meta`, `Head.Title`, `Head.Link`, etc. for IDE autocomplete.
 */
export const Head = Object.assign(
  ({ children }: HeadProps) => {
    if (typeof window !== 'undefined') {
      return children
    }

    const metaState = React.useContext(MetaContext)
    if (!metaState) throw new Error('Head must be used within MetaProvider')

    collectHeadTags({ children, metaState })

    return null
  },
  {
    Meta: MetaComponent,
    Title: TitleComponent,
    Link: LinkComponent,
    Script: ScriptComponent,
    Style: StyleComponent,
    Base: BaseComponent,
  },
)

const VALID_TAGS = new Set(['title', 'meta', 'link', 'base', 'style', 'script'])

function collectHeadTags({
  children,
  metaState,
}: {
  children: React.ReactNode
  metaState: MetaState
}) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
      return
    }

    const tagName = TAG_MAP.get(child.type as Function)
    if (tagName) {
      metaState.addTag(React.createElement(tagName, child.props))
      return
    }

    if (typeof child.type === 'string' && VALID_TAGS.has(child.type)) {
      metaState.addTag(child)
      return
    }

    if (child.props.children == null) {
      return
    }

    collectHeadTags({
      children: child.props.children,
      metaState,
    })
  })
}
