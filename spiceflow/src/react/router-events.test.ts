// Tests event-sourced router selectors for navigation source and scroll projections.
import type { Location } from 'history'
import { describe, expect, test } from 'vitest'
import {
  getLastCommittedNavigationEvent,
  getLatestPendingNavigationRequest,
  getLastNavigationEvent,
  getScrollPositions,
  loadScrollPositions,
  recordScrollPosition,
  router,
  type RouterEvent,
} from './router.js'

function location(
  pathname: string,
  options: { key?: string; search?: string; hash?: string } = {},
): Location {
  return {
    pathname,
    search: options.search ?? '',
    hash: options.hash ?? '',
    state: null,
    key: options.key ?? pathname,
  }
}

describe('router event selectors', () => {
  test('finds the latest unmatched navigation request', () => {
    const events: RouterEvent[] = [
      {
        id: 1,
        type: 'navigation-requested',
        requestId: 1,
        method: 'push',
        location: location('/page-a', { key: 'a' }),
        scrollY: 1200,
      },
      {
        id: 2,
        type: 'navigation-committed',
        requestId: 1,
        action: 'PUSH',
        location: location('/page-b', { key: 'b' }),
        previousLocation: location('/page-a', { key: 'a' }),
        previousScrollY: 1200,
        source: 'navigate',
      },
      {
        id: 3,
        type: 'navigation-requested',
        requestId: 2,
        method: 'refresh',
        location: location('/page-b', { key: 'b' }),
        scrollY: 640,
      },
    ]

    expect(getLatestPendingNavigationRequest(events)).toMatchInlineSnapshot(`
      {
        "id": 3,
        "location": {
          "hash": "",
          "key": "b",
          "pathname": "/page-b",
          "search": "",
          "state": null,
        },
        "method": "refresh",
        "requestId": 2,
        "scrollY": 640,
        "type": "navigation-requested",
      }
    `)
  })

  test('keeps latest scroll positions by key with eviction', () => {
    loadScrollPositions({
      positions: {
        a: 10,
        b: 20,
      },
      maxEntries: 2,
    })
    recordScrollPosition({ locationKey: 'a', scrollY: 30 })
    recordScrollPosition({ locationKey: 'c', scrollY: 40 })

    expect(getScrollPositions({ maxEntries: 2 })).toMatchInlineSnapshot(`
      {
        "a": 30,
        "c": 40,
      }
    `)
  })

  test('returns the latest committed navigation event', () => {
    const events: RouterEvent[] = [
      {
        id: 1,
        type: 'navigation-requested',
        requestId: 1,
        method: 'push',
        location: location('/page-a', { key: 'a' }),
        scrollY: 100,
      },
      {
        id: 2,
        type: 'navigation-committed',
        requestId: 1,
        action: 'PUSH',
        location: location('/page-b', { key: 'b' }),
        previousLocation: location('/page-a', { key: 'a' }),
        previousScrollY: 100,
        source: 'navigate',
      },
      {
        id: 3,
        type: 'navigation-requested',
        requestId: 2,
        method: 'refresh',
        location: location('/page-b', { key: 'b' }),
        scrollY: 250,
      },
      {
        id: 4,
        type: 'navigation-committed',
        requestId: 2,
        action: 'REPLACE',
        location: location('/page-b', { key: 'b' }),
        previousLocation: location('/page-b', { key: 'b' }),
        previousScrollY: 250,
        source: 'refresh',
      },
    ]

    expect(getLastCommittedNavigationEvent(events)).toMatchInlineSnapshot(`
      {
        "action": "REPLACE",
        "id": 4,
        "location": {
          "hash": "",
          "key": "b",
          "pathname": "/page-b",
          "search": "",
          "state": null,
        },
        "previousLocation": {
          "hash": "",
          "key": "b",
          "pathname": "/page-b",
          "search": "",
          "state": null,
        },
        "previousScrollY": 250,
        "requestId": 2,
        "source": "refresh",
        "type": "navigation-committed",
      }
    `)
  })

  test('does not register navigation events or subscribers on the server', () => {
    let called = false
    const unsubscribe = router.subscribe(() => {
      called = true
    })

    router.push('/server-only')
    unsubscribe()

    expect({
      called,
      href: router.href('/server-only', { tab: 'profile' }),
      lastNavigationEvent: getLastNavigationEvent(),
      pathname: router.pathname,
    }).toMatchInlineSnapshot(`
      {
        "called": false,
        "href": "/server-only?tab=profile",
        "lastNavigationEvent": null,
        "pathname": "/server-only",
      }
    `)
  })
})
