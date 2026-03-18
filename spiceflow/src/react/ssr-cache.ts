// SSR HTML cache utilities. Caches the final HTML output keyed by a progressive
// MD5 hash of the RSC flight stream. Only used when the RSC stream completes
// within 50ms (fast pages), so slow streaming responses bypass caching entirely.

import crypto from 'node:crypto'
import { LRUCache } from '../lru.js'

export interface SsrCacheEntry {
  html: Uint8Array
  status: number
  headers: [string, string][]
  byteSize: number
}

export type SsrCacheMode = 'off' | 'post' | 'prehash'

const HEADERS_TO_SKIP_CACHING = new Set([
  'set-cookie',
])

export function hasUncacheableHeaders(headers: Headers): boolean {
  for (const name of HEADERS_TO_SKIP_CACHING) {
    if (headers.has(name)) return true
  }
  return false
}

export function isSsrCacheEnabled() {
  if (typeof process === 'undefined') return true
  const value = process.env.SPICEFLOW_DISABLE_SSR_CACHE
  if (!value) return true
  return value === '0' || value === 'false'
}

export function getSsrCacheMode(): SsrCacheMode {
  if (!isSsrCacheEnabled()) return 'off'
  if (typeof process === 'undefined') return 'post'
  const value = process.env.SPICEFLOW_SSR_CACHE_MODE
  if (!value) return 'post'
  if (value === 'off') return 'off'
  if (value === 'prehash') return 'prehash'
  return 'post'
}

// 5 MB default
export const ssrCache = new LRUCache<SsrCacheEntry>(5 * 1024 * 1024)

/**
 * Creates a TransformStream that progressively hashes each chunk with MD5 as
 * it passes through. Chunks pass through unmodified — the hash is a side effect.
 * `digestPromise` resolves with the hex digest when the stream fully closes
 * (flush runs). Await it instead of polling, since flush may run on a later
 * microtask after allReady resolves.
 */
export function createHashTransform() {
  const hash = crypto.createHash('md5')
  let resolveDigest: (value: string) => void
  const digestPromise = new Promise<string>((r) => { resolveDigest = r })

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      hash.update(chunk)
      controller.enqueue(chunk)
    },
    flush() {
      resolveDigest(hash.digest('hex'))
    },
  })

  return {
    readable: transform.readable,
    writable: transform.writable,
    digestPromise,
  }
}

export function prehashFlightStream(stream: ReadableStream<Uint8Array>) {
  const hash = crypto.createHash('md5')
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()

  const resultPromise = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        hash.update(value)
        chunks.push(value)
      }
      return {
        digest: hash.digest('hex'),
        chunks,
      }
    } finally {
      reader.releaseLock()
    }
  })()

  return {
    resultPromise,
    async cancel() {
      try {
        await reader.cancel()
      } catch {}
    },
  }
}

/**
 * Reads a ReadableStream to completion and concatenates all chunks into a
 * single Uint8Array.
 */
export async function collectStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let totalLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    totalLength += value.byteLength
  }
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }
  return result
}
