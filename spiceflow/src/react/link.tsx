'use client'

import React from 'react'
import type { AnySpiceflow } from '../spiceflow.js'
import type { AllHrefPaths, ExtractParamsFromPath } from '../types.js'
import { getBasePath } from '../base-path.js'
import { buildHref } from './loader-utils.js'
import { type RegisteredApp, type RouterPaths, router } from './router.js'

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

// When path has :param segments, require a params prop. Otherwise optional.
type LinkParamsProps<
  Paths extends string,
  Path extends AllHrefPaths<Paths>,
> = [ExtractParamsFromPath<Path>] extends [undefined]
  ? { params?: Record<string, string | number | boolean> }
  : { params: ExtractParamsFromPath<Path> }

export type LinkProps<
  App extends AnySpiceflow = RegisteredApp,
  Paths extends string = RouterPaths<App>,
  Path extends AllHrefPaths<Paths> = AllHrefPaths<Paths>,
> = Omit<React.ComponentPropsWithRef<'a'>, 'href'> & {
  rawHref?: boolean
  href?: Path
} & LinkParamsProps<Paths, Path>

export function Link<
  App extends AnySpiceflow = RegisteredApp,
  Paths extends string = RouterPaths<App>,
  const Path extends AllHrefPaths<Paths> = AllHrefPaths<Paths>,
>(props: LinkProps<App, Paths, Path>) {
  const { rawHref, params, href: hrefProp, ...rest } = props as LinkProps & { params?: Record<string, any> }
  const resolved = params && hrefProp ? buildHref(hrefProp, params) : hrefProp
  const href = rawHref ? resolved : withBase(resolved)

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
          (props.target && props.target === '_blank') ||
          e.currentTarget.origin !== window.location.origin
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
