// Tests for navigation helpers used by client-side RSC navigation and link handling.

import { describe, expect, test } from 'vitest'
import {
  getLinkNavigationInfo,
  isHashOnlyNavigation,
  isFlightResponse,
  shouldProcessLinkClick,
  toRscPathname,
  toRscUrl,
} from './navigation.js'

describe('toRscPathname', () => {
  test('rewrites pathname variants', () => {
    const cases = ['/', '/foo', '/foo/', '/foo/bar/', '/foo.rsc']
    const result = cases.map((pathname) => {
      return toRscPathname({ pathname })
    })

    expect(result).toMatchInlineSnapshot(`
      [
        "/.rsc",
        "/foo.rsc",
        "/foo.rsc",
        "/foo/bar.rsc",
        "/foo.rsc",
      ]
    `)
  })
})

describe('toRscUrl', () => {
  test('preserves query and strips hash', () => {
    const url = new URL('https://example.com/posts/123/?tab=one#comments')
    const result = toRscUrl({ url }).toString()

    expect(result).toMatchInlineSnapshot(
      '"https://example.com/posts/123.rsc?tab=one&__rsc="',
    )
  })
})

describe('shouldProcessLinkClick', () => {
  test('matches react-router click semantics', () => {
    const leftClick = {
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
    }

    const result = {
      leftClick: shouldProcessLinkClick({
        click: leftClick,
        target: '_self',
      }),
      withModifier: shouldProcessLinkClick({
        click: {
          ...leftClick,
          metaKey: true,
        },
        target: '_self',
      }),
      nonLeftClick: shouldProcessLinkClick({
        click: {
          ...leftClick,
          button: 1,
        },
        target: '_self',
      }),
      targetBlank: shouldProcessLinkClick({
        click: leftClick,
        target: '_blank',
      }),
      defaultPrevented: shouldProcessLinkClick({
        click: leftClick,
        defaultPrevented: true,
        target: '_self',
      }),
    }

    expect(result).toMatchInlineSnapshot(`
      {
        "defaultPrevented": false,
        "leftClick": true,
        "nonLeftClick": false,
        "targetBlank": false,
        "withModifier": false,
      }
    `)
  })
})

describe('getLinkNavigationInfo', () => {
  test('resolves internal navigation info', () => {
    const currentUrl = new URL('https://example.com/posts?tab=all')

    const next = getLinkNavigationInfo({
      link: {
        href: 'https://example.com/posts?tab=all',
      },
      currentUrl,
    })
    const external = getLinkNavigationInfo({
      link: {
        href: 'https://vite.dev/guide',
      },
      currentUrl,
    })

    expect({
      nextUrl: next?.nextUrl.href,
      replace: next?.replace,
      external,
    }).toMatchInlineSnapshot(`
      {
        "external": null,
        "nextUrl": "https://example.com/posts?tab=all",
        "replace": true,
      }
    `)
  })
})

describe('isHashOnlyNavigation', () => {
  test('detects hash-only transitions', () => {
    const currentUrl = new URL('https://example.com/posts?tab=all')

    const result = {
      hashOnly: isHashOnlyNavigation({
        currentUrl,
        nextUrl: new URL('https://example.com/posts?tab=all#comments'),
      }),
      otherPath: isHashOnlyNavigation({
        currentUrl,
        nextUrl: new URL('https://example.com/other#comments'),
      }),
    }

    expect(result).toMatchInlineSnapshot(`
      {
        "hashOnly": true,
        "otherPath": false,
      }
    `)
  })
})

describe('isFlightResponse', () => {
  test('detects text/x-component responses', () => {
    const flightResponse = new Response('', {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
    const htmlResponse = new Response('', {
      headers: { 'content-type': 'text/html;charset=utf-8' },
    })

    expect([
      isFlightResponse({ response: flightResponse }),
      isFlightResponse({ response: htmlResponse }),
    ]).toMatchInlineSnapshot(`
      [
        true,
        false,
      ]
    `)
  })
})
