// Scroll restoration primitives for storing and restoring scroll position across client navigations.
'use client'

import React from 'react'
import { RouterLocation } from './router.js'

export type ScrollRestorationKeyFn = (args: {
  location: RouterLocation
}) => string | null | undefined

export interface ScrollRestorationOptions {
  storageKey: string
  getKey?: ScrollRestorationKeyFn
}

export interface ScrollRestorationProps {
  storageKey?: string
  getKey?: ScrollRestorationKeyFn
}

export const DEFAULT_SCROLL_RESTORATION_STORAGE_KEY =
  'spiceflow-scroll-positions'

let currentScrollRestorationOptions: ScrollRestorationOptions = {
  storageKey: DEFAULT_SCROLL_RESTORATION_STORAGE_KEY,
}

export function getScrollRestorationOptions() {
  return currentScrollRestorationOptions
}

export function getScrollRestorationKey({
  location,
  options,
}: {
  location: RouterLocation
  options: ScrollRestorationOptions
}) {
  const customKey = options.getKey?.({ location })
  if (!customKey) return location.key
  return customKey
}

export function ScrollRestoration({
  storageKey,
  getKey,
}: ScrollRestorationProps) {
  React.useEffect(() => {
    const previousOptions = currentScrollRestorationOptions
    currentScrollRestorationOptions = {
      storageKey: storageKey || DEFAULT_SCROLL_RESTORATION_STORAGE_KEY,
      getKey,
    }

    return () => {
      currentScrollRestorationOptions = previousOptions
    }
  }, [storageKey, getKey])

  return null
}
