// Node adapter for serveStatic with safe file lookups and streamed responses.
// Uses a lazy cache for stat results so repeated requests to the same path
// (e.g. /about hitting serveStatic before falling through to RSC) skip
// filesystem syscalls entirely after the first lookup.
import { createReadStream, statSync, type Stats } from 'node:fs'
import { Readable } from 'node:stream'
import { resolve } from 'node:path'
import {
  getMimeType,
  ServeStaticOptions,
  serveStatic as baseServeStatic,
  staticMiddlewareSymbol,
} from './static.js'
import { MiddlewareHandler } from './types.js'

type CachedStat =
  | { kind: 'file'; size: number; mtime: string }
  | { kind: 'dir' }
  | { kind: 'miss' }

export const serveStatic = (options: ServeStaticOptions): MiddlewareHandler => {
  const root = resolve(options.root ?? '.')
  const cache = options.noCache ? null : new Map<string, CachedStat>()

  function cachedStat(path: string): CachedStat {
    if (cache) {
      const cached = cache.get(path)
      if (cached) return cached
    }

    let result: CachedStat
    try {
      const stats = statSync(path)
      if (stats.isFile()) {
        result = {
          kind: 'file',
          size: stats.size,
          mtime: stats.mtime.toUTCString(),
        }
      } else if (stats.isDirectory()) {
        result = { kind: 'dir' }
      } else {
        result = { kind: 'miss' }
      }
    } catch (err: any) {
      if (!isIgnorableStaticError(err)) throw err
      result = { kind: 'miss' }
    }

    cache?.set(path, result)
    return result
  }

  const getContent = (path: string, c: { request?: Request }) => {
    const stat = cachedStat(path)
    if (stat.kind !== 'file') return null

    const headers = new Headers({
      'content-length': String(stat.size),
      'last-modified': stat.mtime,
    })
    const mimeType = getMimeType(path, options.mimes)
    if (mimeType) {
      headers.set('content-type', mimeType)
    }

    if (c.request?.method === 'HEAD') {
      return new Response(null, { headers })
    }

    const stream = Readable.toWeb(
      createReadStream(path),
    ) as unknown as ReadableStream
    return new Response(stream, { headers })
  }

  const pathResolve = (path: string) => {
    return resolve(path)
  }

  const isDir = (path: string) => {
    return cachedStat(path).kind === 'dir'
  }

  const m = baseServeStatic({
    ...options,
    getContent,
    pathResolve,
    isDir,
  })

  const middleware = function serveStatic(c, next) {
    return m(c, next)
  }

  ;(middleware as any)[staticMiddlewareSymbol] = true
  return middleware
}

function isIgnorableStaticError(err: unknown) {
  const code = (err as { code?: string } | undefined)?.code
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR'
}
