import { stat } from 'fs/promises'
import fs from 'fs'
import { ServeStaticOptions, serveStatic as baseServeStatic } from './static.js'
import { MiddlewareHandler } from './types.js'

export const serveStatic = (options: ServeStaticOptions): MiddlewareHandler => {
  const getContent = (path: string) => {
    path = `./${path}`
    try {
      return fs.readFileSync(path)
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err
      }
    }
    return null
  }
  const pathResolve = (path: string) => {
    return `./${path}`
  }
  const isDir = (path: string) => {
    let isDir
    try {
      const stats = fs.statSync(path)
      isDir = stats.isDirectory()
    } catch {}
    return isDir
  }
  const m = baseServeStatic({
    ...options,
    getContent,
    pathResolve,
    isDir,
  })
  return function serveStatic(c, next) {
    return m(c, next)
  }
}
