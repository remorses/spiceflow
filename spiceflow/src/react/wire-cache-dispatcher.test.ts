import React from 'react'
import { describe, expect, test } from 'vitest'
import { runWithRequestCache } from './wire-cache-dispatcher.js'

// React.cache() only caches in the react-server build. In the default/client
// build it's a no-op wrapper. These tests verify the dispatcher wiring works
// when the full caching implementation is available.
const hasServerCache = !!(React as any)
  .__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

const describeCond = hasServerCache ? describe : describe.skip

describeCond('wire-cache-dispatcher (react-server)', () => {
  const getStore = React.cache(() => ({ items: [] as string[] }))

  test('React.cache() returns the same object within a single runWithRequestCache call', () => {
    runWithRequestCache(() => {
      const a = getStore()
      const b = getStore()
      expect(a).toBe(b)
      a.items.push('x')
      expect(b.items).toEqual(['x'])
    })
  })

  test('different runWithRequestCache calls get isolated caches', () => {
    let storeFromFirst: { items: string[] } | null = null
    let storeFromSecond: { items: string[] } | null = null

    runWithRequestCache(() => {
      storeFromFirst = getStore()
      storeFromFirst.items.push('first')
    })

    runWithRequestCache(() => {
      storeFromSecond = getStore()
      storeFromSecond.items.push('second')
    })

    expect(storeFromFirst!.items).toEqual(['first'])
    expect(storeFromSecond!.items).toEqual(['second'])
    expect(storeFromFirst).not.toBe(storeFromSecond)
  })

  test('nested runWithRequestCache calls get their own scope', () => {
    runWithRequestCache(() => {
      const outer = getStore()
      outer.items.push('outer')

      runWithRequestCache(() => {
        const inner = getStore()
        expect(inner).not.toBe(outer)
        expect(inner.items).toEqual([])
        inner.items.push('inner')
      })

      // Outer scope is restored after nested call
      expect(getStore().items).toEqual(['outer'])
    })
  })
})

describe('wire-cache-dispatcher (any React build)', () => {
  test('runWithRequestCache returns the callback result', () => {
    const result = runWithRequestCache(() => 42)
    expect(result).toBe(42)
  })

  test('React.cache() outside runWithRequestCache falls back to uncached', () => {
    const getStore = React.cache(() => ({ val: Math.random() }))
    const a = getStore()
    const b = getStore()
    // Without react-server build OR without request cache, each call creates fresh
    expect(a).not.toBe(b)
  })
})
