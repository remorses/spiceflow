// Generic LRU cache bounded by total byte size. Each entry must declare its
// byteSize so the cache can track memory usage and evict least-recently-used
// entries when the total exceeds maxBytes.

export interface Sized {
  byteSize: number
}

export class LRUCache<T extends Sized> {
  private map = new Map<string, T>()
  private totalBytes = 0

  constructor(public maxBytes: number) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    // Move to end (most recently used)
    this.map.delete(key)
    this.map.set(key, entry)
    return entry
  }

  set(key: string, entry: T) {
    const existing = this.map.get(key)
    if (existing) {
      this.totalBytes -= existing.byteSize
      this.map.delete(key)
    }
    this.totalBytes += entry.byteSize
    this.map.set(key, entry)
    this.evict()
  }

  get size() {
    return this.map.size
  }

  get bytes() {
    return this.totalBytes
  }

  clear() {
    this.map.clear()
    this.totalBytes = 0
  }

  private evict() {
    while (this.totalBytes > this.maxBytes && this.map.size > 0) {
      const oldest = this.map.keys().next()
      if (oldest.done) break
      const entry = this.map.get(oldest.value)!
      this.totalBytes -= entry.byteSize
      this.map.delete(oldest.value)
    }
  }
}
