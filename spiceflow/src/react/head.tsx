'use client'

import React from 'react'
import { MetaState } from './metastate.js'

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

export const Head = ({ children }: HeadProps) => {
  if (typeof window !== 'undefined') {
    return children
  }

  const metaState = React.useContext(MetaContext)
  if (!metaState) throw new Error('Head must be used within MetaProvider')

  collectHeadTags({ children, metaState })

  return null
}

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
