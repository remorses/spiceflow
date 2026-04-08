'use client'

import React from 'react'
import { getBasePath } from '../base-path.js'
import { router } from './router.js'

function getBase(): string {
  return getBasePath()
}

function hasBasePrefix(path: string, base: string): boolean {
  if (path === base) return true
  const next = path.charAt(base.length)
  return path.startsWith(base) && (next === '/' || next === '?' || next === '#')
}

function withBase(href: string | undefined): string | undefined {
  if (!href) return href
  const base = getBase()
  if (!base) return href
  if (!href.startsWith('/') || href.startsWith('//')) return href
  if (hasBasePrefix(href, base)) return href
  return base + href
}

export function Link(
  props: React.ComponentPropsWithRef<'a'> & { rawHref?: boolean },
) {
  const { rawHref, ...rest } = props
  const href = rawHref ? props.href : withBase(props.href)
  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          (props.target && props.target === '_blank')
        ) {
          props.onClick?.(e)
          return
        }
        e.preventDefault()

        props.onClick?.(e)
        router.push(
          e.currentTarget.pathname +
            e.currentTarget.search +
            e.currentTarget.hash,
        )
      }}
    />
  )
}
