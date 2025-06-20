import { describe, test, expect, vi } from 'vitest'
import { Spiceflow } from './spiceflow.ts'

describe('waitUntil', () => {
  test('waitUntil is available in handler context', async () => {
    let waitUntilCalled = false
    let waitUntilPromise: Promise<any> | null = null

    const mockWaitUntil = vi.fn((promise: Promise<any>) => {
      waitUntilCalled = true
      waitUntilPromise = promise
    })

    const app = new Spiceflow({
      waitUntil: mockWaitUntil
    }).route({
      method: 'GET',
      path: '/test',
      handler({ waitUntil }) {
        expect(typeof waitUntil).toBe('function')
        
        const backgroundTask = Promise.resolve('background work done')
        waitUntil(backgroundTask)
        
        return { success: true }
      }
    })

    const response = await app.handle(new Request('http://localhost/test'))
    const data = await response.json()

    expect(data).toEqual({ success: true })
    expect(waitUntilCalled).toBe(true)
    expect(mockWaitUntil).toHaveBeenCalledTimes(1)
    expect(waitUntilPromise).toBeInstanceOf(Promise)
  })

  test('waitUntil defaults to noop when not provided', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/test',
      handler({ waitUntil }) {
        expect(typeof waitUntil).toBe('function')
        
        // Should not throw when called
        waitUntil(Promise.resolve('test'))
        
        return { success: true }
      }
    })

    const response = await app.handle(new Request('http://localhost/test'))
    const data = await response.json()

    expect(data).toEqual({ success: true })
  })

  test('waitUntil can be called multiple times', async () => {
    const mockWaitUntil = vi.fn()

    const app = new Spiceflow({
      waitUntil: mockWaitUntil
    }).route({
      method: 'POST',
      path: '/multi',
      handler({ waitUntil }) {
        waitUntil(Promise.resolve('task 1'))
        waitUntil(Promise.resolve('task 2'))
        waitUntil(Promise.resolve('task 3'))
        
        return { taskCount: 3 }
      }
    })

    const response = await app.handle(new Request('http://localhost/multi', {
      method: 'POST'
    }))
    const data = await response.json()

    expect(data).toEqual({ taskCount: 3 })
    expect(mockWaitUntil).toHaveBeenCalledTimes(3)
  })

  test('waitUntil works with middleware context', async () => {
    const mockWaitUntil = vi.fn()

    const app = new Spiceflow({
      waitUntil: mockWaitUntil
    })
      .use(({ waitUntil }, next) => {
        expect(typeof waitUntil).toBe('function')
        waitUntil(Promise.resolve('middleware task'))
        return next()
      })
      .route({
        method: 'GET',
        path: '/middleware',
        handler({ waitUntil }) {
          waitUntil(Promise.resolve('handler task'))
          return { success: true }
        }
      })

    const response = await app.handle(new Request('http://localhost/middleware'))
    const data = await response.json()

    expect(data).toEqual({ success: true })
    expect(mockWaitUntil).toHaveBeenCalledTimes(2)
  })

  test('waitUntil uses global waitUntil when available', async () => {
    // Mock global waitUntil
    const originalGlobal = globalThis as any
    const mockGlobalWaitUntil = vi.fn()
    originalGlobal.waitUntil = mockGlobalWaitUntil

    try {
      const app = new Spiceflow().route({
        method: 'GET',
        path: '/global',
        handler({ waitUntil }) {
          waitUntil(Promise.resolve('using global'))
          return { usingGlobal: true }
        }
      })

      const response = await app.handle(new Request('http://localhost/global'))
      const data = await response.json()

      expect(data).toEqual({ usingGlobal: true })
      expect(mockGlobalWaitUntil).toHaveBeenCalledTimes(1)
    } finally {
      // Clean up
      delete originalGlobal.waitUntil
    }
  })

  test('custom waitUntil overrides global waitUntil', async () => {
    // Mock global waitUntil
    const originalGlobal = globalThis as any
    const mockGlobalWaitUntil = vi.fn()
    const mockCustomWaitUntil = vi.fn()
    originalGlobal.waitUntil = mockGlobalWaitUntil

    try {
      const app = new Spiceflow({
        waitUntil: mockCustomWaitUntil
      }).route({
        method: 'GET',
        path: '/custom',
        handler({ waitUntil }) {
          waitUntil(Promise.resolve('using custom'))
          return { usingCustom: true }
        }
      })

      const response = await app.handle(new Request('http://localhost/custom'))
      const data = await response.json()

      expect(data).toEqual({ usingCustom: true })
      expect(mockCustomWaitUntil).toHaveBeenCalledTimes(1)
      expect(mockGlobalWaitUntil).not.toHaveBeenCalled()
    } finally {
      // Clean up
      delete originalGlobal.waitUntil
    }
  })
})