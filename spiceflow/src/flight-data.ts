// Minimal Flight-protocol data encoder/decoder for the spiceflow typed client.
// Produces the same wire format as React's renderToReadableStream ($D, $Q, $W,
// $n, etc.) so payloads are compatible with any Flight-aware consumer. Only
// handles plain data types — no React elements, server/client references, or
// streaming. Written from scratch based on the Flight wire format spec.
//
// Wire format: newline-separated rows, each is `<id>:<json>\n`.
//   - Row 0 is the root value.
//   - Map/Set entries are extracted into their own rows with incremented ids.
//   - Special string prefixes encode non-JSON types:
//       $D<iso>        Date
//       $Q<id>         Map  (entries at chunk <id>)
//       $W<id>         Set  (items at chunk <id>)
//       $n<digits>     BigInt
//       $undefined     undefined
//       $NaN           NaN
//       $Infinity      Infinity
//       $-Infinity     -Infinity
//       $-0            negative zero
//       $R<regex>      RegExp
//       $S<key>        Symbol.for(key)
//       $$<rest>       escaped literal "$"
//       $Z<json>       Error
//       $l<href>       URL

// ---------------------------------------------------------------------------
// Encoder
// ---------------------------------------------------------------------------

export function flightEncode(value: unknown): string {
  const chunks: string[] = []
  let nextId = 1 // 0 is reserved for the root

  function getNextId(): number {
    return nextId++
  }

  function writeChunk(id: number, serialized: unknown): void {
    chunks.push(`${id}:${JSON.stringify(serialized)}\n`)
  }

  function serialize(val: unknown): unknown {
    if (val === null) return null
    if (val === undefined) return '$undefined'

    if (typeof val === 'boolean') return val

    if (typeof val === 'number') {
      if (Number.isNaN(val)) return '$NaN'
      if (val === Infinity) return '$Infinity'
      if (val === -Infinity) return '$-Infinity'
      if (Object.is(val, -0)) return '$-0'
      return val
    }

    if (typeof val === 'string') {
      if (val.startsWith('$')) return '$' + val
      if (val.startsWith('@')) return '@' + val
      return val
    }

    if (typeof val === 'bigint') return '$n' + val.toString()

    if (val instanceof RegExp) return '$R' + val.toString()

    if (typeof val === 'symbol') {
      const key = Symbol.keyFor(val)
      if (key !== undefined) return '$S' + key
      return '$undefined'
    }

    if (val instanceof Date) return '$D' + val.toISOString()

    if (val instanceof Map) {
      const entries = Array.from(val.entries()).map(([k, v]) => [
        serialize(k),
        serialize(v),
      ])
      const id = getNextId()
      writeChunk(id, entries)
      return '$Q' + id
    }

    if (val instanceof Set) {
      const items = Array.from(val).map((item) => serialize(item))
      const id = getNextId()
      writeChunk(id, items)
      return '$W' + id
    }

    if (val instanceof Error) {
      const info: Record<string, unknown> = {
        name: val.name,
        message: val.message,
        stack: val.stack,
      }
      for (const key of Object.keys(val)) {
        if (!(key in info)) {
          info[key] = serialize((val as any)[key])
        }
      }
      return '$Z' + JSON.stringify(info)
    }

    if (typeof URL !== 'undefined' && val instanceof URL) {
      return '$l' + val.href
    }

    if (Array.isArray(val)) {
      return val.map((item) => serialize(item))
    }

    if (typeof val === 'object') {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(val as object)) {
        result[key] = serialize((val as any)[key])
      }
      return result
    }

    return val
  }

  const root = serialize(value)
  // Referenced chunks (Map/Set entries) are written first by the serialize
  // calls above. The root chunk (id 0) comes last — matching React's Flight
  // output order where referenced rows precede the root row.
  const rootRow = `0:${JSON.stringify(root)}\n`
  return chunks.join('') + rootRow
}

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

export function flightDecode(payload: string): unknown {
  const resolved = new Map<number, unknown>()

  // Parse all rows first
  const rows: Array<{ id: number; raw: string }> = []
  for (const line of payload.split('\n')) {
    if (!line) continue
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const id = parseInt(line.slice(0, colonIdx), 10)
    const raw = line.slice(colonIdx + 1)
    rows.push({ id, raw })
  }

  // Resolve rows in order (referenced chunks before root)
  for (const row of rows) {
    const parsed = JSON.parse(row.raw)
    resolved.set(row.id, revive(parsed))
  }

  return resolved.get(0)

  function revive(val: unknown): unknown {
    if (val === null || typeof val === 'boolean' || typeof val === 'number') {
      return val
    }

    if (typeof val === 'string') {
      return reviveString(val)
    }

    if (Array.isArray(val)) {
      return val.map((item) => revive(item))
    }

    if (typeof val === 'object') {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(val as object)) {
        result[key] = revive((val as any)[key])
      }
      return result
    }

    return val
  }

  function reviveString(val: string): unknown {
    const ch = val.charCodeAt(0)
    // Fast exit for plain strings (no $ or @ prefix)
    if (ch !== 0x24 /* $ */ && ch !== 0x40 /* @ */) return val

    // Escaped @ → literal @
    if (ch === 0x40 && val.charCodeAt(1) === 0x40) return val.slice(1)
    // Non-escaped @ → return as-is (promise refs not used for data-only)
    if (ch === 0x40) return val

    // $ prefixed values
    if (val === '$undefined') return undefined
    if (val === '$NaN') return NaN
    if (val === '$Infinity') return Infinity
    if (val === '$-Infinity') return -Infinity
    if (val === '$-0') return -0

    // Escaped $ → literal $
    if (val.charCodeAt(1) === 0x24) return val.slice(1)

    if (val.startsWith('$n')) return BigInt(val.slice(2))

    if (val.startsWith('$R')) {
      const match = val.slice(2).match(/^\/(.*)\/([gimsuy]*)$/)
      if (match) return new RegExp(match[1], match[2])
      return val
    }

    if (val.startsWith('$S')) return Symbol.for(val.slice(2))

    if (val.startsWith('$D')) return new Date(val.slice(2))

    if (val.startsWith('$Q')) {
      const id = parseInt(val.slice(2), 10)
      const entries = resolved.get(id) as Array<[unknown, unknown]>
      return new Map(entries)
    }

    if (val.startsWith('$W')) {
      const id = parseInt(val.slice(2), 10)
      const items = resolved.get(id) as unknown[]
      return new Set(items)
    }

    if (val.startsWith('$Z')) {
      const info = JSON.parse(val.slice(2))
      const err = new Error(info.message)
      err.name = info.name
      if (info.stack) err.stack = info.stack
      for (const key of Object.keys(info)) {
        if (key !== 'name' && key !== 'message' && key !== 'stack') {
          ;(err as any)[key] = revive(info[key])
        }
      }
      return err
    }

    if (val.startsWith('$l')) {
      try {
        return new URL(val.slice(2))
      } catch {
        return val
      }
    }

    // Chunk reference ($<digits>) — resolve from previously parsed chunks
    if (ch === 0x24) {
      const rest = val.slice(1)
      const maybeId = parseInt(rest, 10)
      if (!Number.isNaN(maybeId) && resolved.has(maybeId)) {
        return resolved.get(maybeId)
      }
    }

    return val
  }
}
