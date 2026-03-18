import { describe, test, expect } from 'vitest'
import { LRUCache } from '../lru.js'
import { createHashTransform, collectStream, getSsrCacheMode, hasUncacheableHeaders, isSsrCacheEnabled, prehashFlightStream } from './ssr-cache.js'

const encoder = new TextEncoder()

function makeEntry(size: number) {
  return {
    html: new Uint8Array(size),
    status: 200,
    headers: [['content-type', 'text/html']] as [string, string][],
    byteSize: size,
  }
}

async function hashBytes(chunks: Uint8Array[]) {
  const { readable, writable, digestPromise } = createHashTransform()
  const source = new Blob(chunks).stream()
  // Must consume readable concurrently — pipeTo blocks if no one drains the output
  await Promise.all([
    source.pipeTo(writable),
    readable.pipeTo(new WritableStream()),
  ])
  return { digest: await digestPromise }
}

describe('LRUCache', () => {
  test('get returns undefined for missing key', () => {
    const cache = new LRUCache(1024)
    expect(cache.get('missing')).toBe(undefined)
  })

  test('set and get round-trip', () => {
    const cache = new LRUCache(1024)
    const entry = makeEntry(100)
    cache.set('a', entry)
    expect(cache.get('a')).toBe(entry)
    expect(cache.size).toBe(1)
    expect(cache.bytes).toBe(100)
  })

  test('evicts oldest entries when exceeding maxBytes', () => {
    const cache = new LRUCache(250)
    cache.set('a', makeEntry(100))
    cache.set('b', makeEntry(100))
    cache.set('c', makeEntry(100))
    expect(cache.get('a')).toBe(undefined)
    expect(cache.get('b')).not.toBe(undefined)
    expect(cache.get('c')).not.toBe(undefined)
    expect(cache.bytes).toBeLessThanOrEqual(250)
  })

  test('accessing an entry makes it most recent (not evicted)', () => {
    const cache = new LRUCache(250)
    cache.set('a', makeEntry(100))
    cache.set('b', makeEntry(100))
    cache.get('a')
    cache.set('c', makeEntry(100))
    expect(cache.get('a')).not.toBe(undefined)
    expect(cache.get('b')).toBe(undefined)
    expect(cache.get('c')).not.toBe(undefined)
  })

  test('replacing an existing key updates byteSize', () => {
    const cache = new LRUCache(1024)
    cache.set('a', makeEntry(100))
    expect(cache.bytes).toBe(100)
    cache.set('a', makeEntry(200))
    expect(cache.bytes).toBe(200)
    expect(cache.size).toBe(1)
  })

  test('clear resets everything', () => {
    const cache = new LRUCache(1024)
    cache.set('a', makeEntry(100))
    cache.set('b', makeEntry(200))
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.bytes).toBe(0)
    expect(cache.get('a')).toBe(undefined)
  })

  test('single entry larger than maxBytes gets evicted immediately', () => {
    const cache = new LRUCache(50)
    cache.set('big', makeEntry(100))
    expect(cache.size).toBe(0)
  })
})

describe('createHashTransform', () => {
  test('same content produces same digest', async () => {
    const r1 = await hashBytes([encoder.encode('hello'), encoder.encode(' world')])
    const r2 = await hashBytes([encoder.encode('hello'), encoder.encode(' world')])
    expect(r1.digest).toBe(r2.digest)
  })

  test('different content produces different digest', async () => {
    const r1 = await hashBytes([encoder.encode('aaa')])
    const r2 = await hashBytes([encoder.encode('bbb')])
    expect(r1.digest).not.toBe(r2.digest)
  })

  test('digest is a 32-char hex string (md5)', async () => {
    const r = await hashBytes([encoder.encode('test')])
    expect(r.digest).toMatch(/^[0-9a-f]{32}$/)
  })

  test('digestPromise resolves only after stream closes', async () => {
    const { readable, writable, digestPromise } = createHashTransform()
    let resolved = false
    digestPromise.then(() => { resolved = true })
    // Start draining readable concurrently to avoid backpressure
    const drain = readable.pipeTo(new WritableStream())
    // Write a chunk but don't close yet
    const writer = writable.getWriter()
    await writer.write(encoder.encode('partial'))
    // Digest should not be resolved yet since stream is still open
    await new Promise((r) => setTimeout(r, 10))
    expect(resolved).toBe(false)
    // Close the stream — flush runs and digest resolves
    await writer.close()
    await drain
    const digest = await digestPromise
    expect(digest).toMatch(/^[0-9a-f]{32}$/)
  })

  test('passes chunks through unmodified', async () => {
    const { readable, writable } = createHashTransform()
    const source = new Blob([encoder.encode('hello'), encoder.encode(' world')]).stream()
    const piped = source.pipeThrough({ readable, writable })
    const result = await collectStream(piped)
    expect(new TextDecoder().decode(result)).toBe('hello world')
  })
})

describe('collectStream', () => {
  test('concatenates all chunks into single Uint8Array', async () => {
    const chunks = [encoder.encode('hello'), encoder.encode(' '), encoder.encode('world')]
    const result = await collectStream(new Blob(chunks).stream())
    expect(new TextDecoder().decode(result)).toBe('hello world')
    expect(result.byteLength).toBe(11)
  })

  test('empty stream produces empty Uint8Array', async () => {
    const result = await collectStream(new Blob([]).stream())
    expect(result.byteLength).toBe(0)
  })
})

describe('prehashFlightStream', () => {
  test('returns digest and original bytes', async () => {
    const chunks = [encoder.encode('hello'), encoder.encode(' world')]
    const prehash = prehashFlightStream(new Blob(chunks).stream())
    const result = await prehash.resultPromise
    expect(result.digest).toMatch(/^[0-9a-f]{32}$/)
    expect(await new Blob(result.chunks).text()).toBe('hello world')
  })

  test('cancel stops the reader cleanly', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode('chunk'))
      },
    })
    const prehash = prehashFlightStream(stream)
    await prehash.cancel()
    await expect(prehash.resultPromise).resolves.toEqual({
      digest: 'd41d8cd98f00b204e9800998ecf8427e',
      chunks: [],
    })
  })
})

describe('hasUncacheableHeaders', () => {
  test('returns true when Set-Cookie is present', () => {
    const headers = new Headers()
    headers.set('set-cookie', 'session=abc')
    expect(hasUncacheableHeaders(headers)).toBe(true)
  })

  test('returns false for normal headers', () => {
    const headers = new Headers()
    headers.set('content-type', 'text/html')
    headers.set('x-custom', 'value')
    expect(hasUncacheableHeaders(headers)).toBe(false)
  })
})

describe('isSsrCacheEnabled', () => {
  test('is enabled by default', () => {
    const original = process.env.SPICEFLOW_DISABLE_SSR_CACHE
    delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
    try {
      expect(isSsrCacheEnabled()).toBe(true)
    } finally {
      if (original === undefined) {
        delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
      } else {
        process.env.SPICEFLOW_DISABLE_SSR_CACHE = original
      }
    }
  })

  test('is disabled when SPICEFLOW_DISABLE_SSR_CACHE is set', () => {
    const original = process.env.SPICEFLOW_DISABLE_SSR_CACHE
    process.env.SPICEFLOW_DISABLE_SSR_CACHE = '1'
    try {
      expect(isSsrCacheEnabled()).toBe(false)
    } finally {
      if (original === undefined) {
        delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
      } else {
        process.env.SPICEFLOW_DISABLE_SSR_CACHE = original
      }
    }
  })

  test('treats 0 and false as enabled', () => {
    const original = process.env.SPICEFLOW_DISABLE_SSR_CACHE
    try {
      process.env.SPICEFLOW_DISABLE_SSR_CACHE = '0'
      expect(isSsrCacheEnabled()).toBe(true)
      process.env.SPICEFLOW_DISABLE_SSR_CACHE = 'false'
      expect(isSsrCacheEnabled()).toBe(true)
    } finally {
      if (original === undefined) {
        delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
      } else {
        process.env.SPICEFLOW_DISABLE_SSR_CACHE = original
      }
    }
  })
})

describe('getSsrCacheMode', () => {
  test('defaults to post', () => {
    const originalDisable = process.env.SPICEFLOW_DISABLE_SSR_CACHE
    const originalMode = process.env.SPICEFLOW_SSR_CACHE_MODE
    delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
    delete process.env.SPICEFLOW_SSR_CACHE_MODE
    try {
      expect(getSsrCacheMode()).toBe('post')
    } finally {
      if (originalDisable === undefined) {
        delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
      } else {
        process.env.SPICEFLOW_DISABLE_SSR_CACHE = originalDisable
      }
      if (originalMode === undefined) {
        delete process.env.SPICEFLOW_SSR_CACHE_MODE
      } else {
        process.env.SPICEFLOW_SSR_CACHE_MODE = originalMode
      }
    }
  })

  test('supports prehash mode', () => {
    const originalDisable = process.env.SPICEFLOW_DISABLE_SSR_CACHE
    const originalMode = process.env.SPICEFLOW_SSR_CACHE_MODE
    delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
    process.env.SPICEFLOW_SSR_CACHE_MODE = 'prehash'
    try {
      expect(getSsrCacheMode()).toBe('prehash')
    } finally {
      if (originalDisable === undefined) {
        delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
      } else {
        process.env.SPICEFLOW_DISABLE_SSR_CACHE = originalDisable
      }
      if (originalMode === undefined) {
        delete process.env.SPICEFLOW_SSR_CACHE_MODE
      } else {
        process.env.SPICEFLOW_SSR_CACHE_MODE = originalMode
      }
    }
  })

  test('disable flag wins over mode', () => {
    const originalDisable = process.env.SPICEFLOW_DISABLE_SSR_CACHE
    const originalMode = process.env.SPICEFLOW_SSR_CACHE_MODE
    process.env.SPICEFLOW_DISABLE_SSR_CACHE = '1'
    process.env.SPICEFLOW_SSR_CACHE_MODE = 'prehash'
    try {
      expect(getSsrCacheMode()).toBe('off')
    } finally {
      if (originalDisable === undefined) {
        delete process.env.SPICEFLOW_DISABLE_SSR_CACHE
      } else {
        process.env.SPICEFLOW_DISABLE_SSR_CACHE = originalDisable
      }
      if (originalMode === undefined) {
        delete process.env.SPICEFLOW_SSR_CACHE_MODE
      } else {
        process.env.SPICEFLOW_SSR_CACHE_MODE = originalMode
      }
    }
  })
})
