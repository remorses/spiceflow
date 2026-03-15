// Node adapter for serveStatic with safe file lookups and streamed responses.
import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { resolve } from 'node:path'
import {
  getMimeType,
  ServeStaticOptions,
  serveStatic as baseServeStatic,
  staticMiddlewareSymbol,
} from './static.js'
import { MiddlewareHandler } from './types.js'

export const serveStatic = (options: ServeStaticOptions): MiddlewareHandler => {
  const root = resolve(options.root ?? '.')

  const getContent = (path: string, c: { request?: Request }) => {
    try {
      const stats = statSync(path)
      if (!stats.isFile()) {
        return null
      }

      const headers = new Headers({
        'content-length': String(stats.size),
        'last-modified': stats.mtime.toUTCString(),
      })
      const mimeType = getMimeType(path, options.mimes)
      if (mimeType) {
        headers.set('content-type', mimeType)
      }

      if (c.request?.method === 'HEAD') {
        return new Response(null, { headers })
      }

      const stream = Readable.toWeb(createReadStream(path)) as unknown as ReadableStream
      return new Response(stream, { headers })
    } catch (err: any) {
      if (!isIgnorableStaticError(err)) {
        throw err
      }
    }

    return null
  }

  const pathResolve = (path: string) => {
    return resolve(path)
  }

  const isDir = (path: string) => {
    try {
      return statSync(path).isDirectory()
    } catch (err) {
      if (!isIgnorableStaticError(err)) {
        throw err
      }
    }
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
