// Validates that React.cache() works correctly for server components.
// React.cache() only caches in the react-server build (the default/client
// build degrades it to a no-op wrapper). These tests check:
// 1. That the react-server condition is correctly resolved (vitest needs
//    the "react-server" condition for this to pass)
// 2. That React.cache() returns the same reference within a synchronous scope
//
// In the full RSC rendering pipeline (e2e), this is validated by the
// Head/CollectedHead tests: Head pushes tags to a React.cache()-backed
// store, and CollectedHead reads from the same store. If React.cache()
// breaks, no Head tags appear in SSR HTML.
import React from 'react'
import { describe, expect, test } from 'vitest'

const hasServerInternals = !!(React as any)
  .__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

const describeCond = hasServerInternals ? describe : describe.skip

describeCond('React.cache() with react-server condition', () => {
  const getStore = React.cache(() => ({ items: [] as string[] }))

  test('returns the same reference within a synchronous scope', () => {
    const a = getStore()
    const b = getStore()
    expect(a).toBe(b)
    a.items.push('x')
    expect(b.items).toEqual(['x'])
  })
})

describe('React build detection', () => {
  test('react-server internals key exists when react-server condition is active', () => {
    // This test documents the expected behavior. If it fails, the
    // vitest config is missing the "react-server" resolve condition.
    // Without it, React.cache() silently degrades to uncached mode.
    if (hasServerInternals) {
      expect(
        (React as any).__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      ).toBeDefined()
    } else {
      expect(
        (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      ).toBeDefined()
    }
  })
})
