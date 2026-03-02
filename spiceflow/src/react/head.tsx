'use client'

import React from 'react'
import { MetaState } from './metastate.js'

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

export const Head = ({ children }) => {
  if (typeof window !== 'undefined') {
    return children
  }
  const metaState = React.useContext(MetaContext)
  if (!metaState) throw new Error('Meta must be used within MetaProvider')

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && VALID_TAGS.has(child.type as string)) {
      metaState.addTag(child)
    }
  })

  return null
}

const VALID_TAGS = new Set(['title', 'meta', 'link', 'base', 'style', 'script'])
