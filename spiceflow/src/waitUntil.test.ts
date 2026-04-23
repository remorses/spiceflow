import { describe, test, expect, vi } from 'vitest'
import { Spiceflow } from './spiceflow.js'
import { pendingWaitUntilCount } from '#wait-until'

describe('waitUntil', () => {
  test('default waitUntil tracks pending promises', async () => {
    let resolve!: () => void
    const slow = new Promise<void>((r) => {
      resolve = r
    })

    const app = new Spiceflow().route({
      method: 'GET',
      path: '/bg',
      handler({ waitUntil }) {
        waitUntil(slow)
        return { ok: true }
      },
    })

    const before = pendingWaitUntilCount()
    await app.handle(new Request('http://localhost/bg'))

    expect(pendingWaitUntilCount()).toBe(before + 1)
    resolve()
    // let microtasks flush
    await new Promise((r) => setTimeout(r, 10))
    expect(pendingWaitUntilCount()).toBe(before)
  })

  test('waitUntil is available in handler context', async () => {
    let waitUntilCalled = false
    let waitUntilPromise: Promise<any> | null = null

    const mockWaitUntil = vi.fn((promise: Promise<any>) => {
      waitUntilCalled = true
      waitUntilPromise = promise
    })

    const app = new Spiceflow({
      waitUntil: mockWaitUntil,
    }).route({
      method: 'GET',
      path: '/test',
      handler({ waitUntil }) {
        expect(typeof waitUntil).toBe('function')

        const backgroundTask = Promise.resolve('background work done')
        waitUntil(backgroundTask)

        return { success: true }
      },
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
      },
    })

    const response = await app.handle(new Request('http://localhost/test'))
    const data = await response.json()

    expect(data).toEqual({ success: true })
  })

  test('waitUntil can be called multiple times', async () => {
    const mockWaitUntil = vi.fn()

    const app = new Spiceflow({
      waitUntil: mockWaitUntil,
    }).route({
      method: 'POST',
      path: '/multi',
      handler({ waitUntil }) {
        waitUntil(Promise.resolve('task 1'))
        waitUntil(Promise.resolve('task 2'))
        waitUntil(Promise.resolve('task 3'))

        return { taskCount: 3 }
      },
    })

    const response = await app.handle(
      new Request('http://localhost/multi', {
        method: 'POST',
      }),
    )
    const data = await response.json()

    expect(data).toEqual({ taskCount: 3 })
    expect(mockWaitUntil).toHaveBeenCalledTimes(3)
  })

  test('waitUntil works with middleware context', async () => {
    const mockWaitUntil = vi.fn()

    const app = new Spiceflow({
      waitUntil: mockWaitUntil,
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
        },
      })

    const response = await app.handle(
      new Request('http://localhost/middleware'),
    )
    const data = await response.json()

    expect(data).toEqual({ success: true })
    expect(mockWaitUntil).toHaveBeenCalledTimes(2)
  })

})
