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

const HEADERS_TO_SKIP_CACHING = new Set([
  'set-cookie',
])

export function hasUncacheableHeaders(headers: Headers): boolean {
  for (const name of HEADERS_TO_SKIP_CACHING) {
    if (headers.has(name)) return true
  }
  return false
}

// 5 MB default
export const ssrCache = new LRUCache<SsrCacheEntry>(5 * 1024 * 1024)

/**
 * Creates a TransformStream that progressively hashes each chunk with MD5 as
 * it passes through. Call `getDigest()` after the stream is fully consumed to
 * get the final hash. Chunks pass through unmodified — the hash is a side effect.
 */
export function createHashTransform() {
  const hash = crypto.createHash('md5')
  let digest: string | undefined

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      hash.update(chunk)
      controller.enqueue(chunk)
    },
    flush() {
      digest = hash.digest('hex')
    },
  })

  return {
    readable: transform.readable,
    writable: transform.writable,
    getDigest() { return digest },
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
