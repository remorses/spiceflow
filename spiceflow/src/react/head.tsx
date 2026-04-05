import React from 'react'
import { getProcessedHeadTagElements } from './head-processing.js'
import { DocumentTitle } from './document-title.js'
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

const getHeadStore = React.cache(() => ({ tags: [] as React.ReactElement[] }))

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
 * for the current RSC render so layouts and pages can override each other by key.
 */
export const Head = Object.assign(
  ({ children }: HeadProps) => {
    getHeadStore().tags.push(...collectHeadElements(children))
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

export function CollectedHead({ baseUrl }: { baseUrl?: string }) {
  const reversed = [...getHeadStore().tags].reverse()
  const processedTags = getProcessedHeadTagElements({ tags: reversed, baseUrl })
  // Read the title from the deduplicated output so DocumentTitle's useEffect
  // sets document.title to the same value that CollectedHead rendered into the
  // server <title> tag. Using reversed.find() here would return a different
  // entry than the Map-based dedup in getProcessedHeadTagElements, causing the
  // layout title to overwrite the page title during hydration.
  const titleTag = processedTags.find((t) => t.type === 'title')
  const title = titleTag
    ? stringifyChildren(
        (titleTag.props as { children?: React.ReactNode }).children,
      )
    : undefined
  return (
    <>
      {processedTags}
      {title !== undefined && <DocumentTitle title={title} />}
    </>
  )
}

function stringifyChildren(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(stringifyChildren).join('')
  return ''
}

const VALID_TAGS = new Set(['title', 'meta', 'link', 'base', 'style', 'script'])

export function collectHeadElements(children: React.ReactNode) {
  const tags: React.ReactElement[] = []
  collectHeadTags({ children, tags })
  return tags
}

function collectHeadTags({
  children,
  tags,
}: {
  children: React.ReactNode
  tags: React.ReactElement[]
}) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
      return
    }

    const tagName = TAG_MAP.get(child.type as Function)
    if (tagName) {
      tags.push(React.createElement(tagName, child.props))
      return
    }

    if (typeof child.type === 'string' && VALID_TAGS.has(child.type)) {
      tags.push(child)
      return
    }

    if (child.props.children == null) {
      return
    }

    collectHeadTags({
      children: child.props.children,
      tags,
    })
  })
}
