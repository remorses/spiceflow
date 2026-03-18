import { describe, test, expect } from 'vitest'
import { LRUCache } from '../lru.js'
import { createHashTransform, collectStream, hasUncacheableHeaders } from './ssr-cache.js'

const encoder = new TextEncoder()

function makeEntry(size: number) {
  return {
    html: new Uint8Array(size),
    status: 200,
    headers: [['content-type', 'text/html']] as [string, string][],
    byteSize: size,
  }
}

async function hashBytes(chunks: Uint8Array[]): Promise<{ digest: string | undefined }> {
  const { readable, writable, getDigest } = createHashTransform()
  const source = new Blob(chunks).stream()
  // Must consume readable concurrently — pipeTo blocks if no one drains the output
  await Promise.all([
    source.pipeTo(writable),
    readable.pipeTo(new WritableStream()),
  ])
  return { digest: getDigest() }
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

  test('digest is undefined before stream is fully consumed', () => {
    const { getDigest } = createHashTransform()
    expect(getDigest()).toBe(undefined)
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
