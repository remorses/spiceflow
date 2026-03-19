// Static file path resolution shared by environment-specific adapters.
import { MiddlewareHandler } from './types.js'
import { isResponse } from './utils.js'

type Env = {}
type Context<E extends Env = Env> = {}
type Data = any

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string
  path?: string
  mimes?: Record<string, string>
  rewriteRequestPath?: (path: string) => string
  onFound?: (path: string, c: Context<E>) => void | Promise<void>
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
  /** Disable stat result caching. When false (default), filesystem lookups are
   * cached after the first access so repeated requests to the same path skip
   * syscalls entirely. Set to true in environments where files change at runtime. */
  noCache?: boolean
}

const DEFAULT_DOCUMENT = 'index.html'
const defaultPathResolve = (path: string) => path
export const staticMiddlewareSymbol = Symbol.for('spiceflow.serve-static')

export function isStaticMiddleware(handler: unknown): boolean {
  return Boolean((handler as any)?.[staticMiddlewareSymbol])
}

function markStaticMiddleware<T extends MiddlewareHandler>(handler: T): T {
  ;(handler as any)[staticMiddlewareSymbol] = true
  return handler
}

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> & {
    getContent: (
      path: string,
      c: Context<E>,
    ) => Data | Response | null | Promise<Data | Response | null>
    pathResolve?: (path: string) => string
    isDir?: (path: string) => boolean | undefined | Promise<boolean | undefined>
  },
): MiddlewareHandler => {
  return markStaticMiddleware(async (c, next) => {
    if (c.request.method !== 'GET' && c.request.method !== 'HEAD') {
      return await next()
    }

    const root = options.root
    const pathResolve = options.pathResolve ?? defaultPathResolve
    const resolvedPath = getResolvedFilePath({ c, options })

    if (!resolvedPath) {
      await options.onNotFound?.(new URL(c.request.url).pathname, c)
      return await next()
    }

    const exactPath = pathResolve(resolvedPath)
    const directory = options.isDir ? await options.isDir(exactPath) : false
    const candidatePath = directory
      ? pathResolve(
          getFilePathWithoutDefaultDocument({
            filename: appendTrailingSlash(resolvedPath) + DEFAULT_DOCUMENT,
            root,
          })!,
        )
      : exactPath

    const content = await options.getContent(candidatePath, c)

    if (isResponse(content)) {
      await options.onFound?.(candidatePath, c)
      return content
    }

    if (content) {
      const mimeType = getMimeType(candidatePath, options.mimes)
      const response = new Response(content)
      response.headers.set('Content-Type', mimeType || 'application/octet-stream')
      await options.onFound?.(candidatePath, c)
      return response
    }

    await options.onNotFound?.(candidatePath, c)
    await next()
    return
  })
}

function getResolvedFilePath<E extends Env>({
  c,
  options,
}: {
  c: Context<E> & { request: Request }
  options: ServeStaticOptions<E>
}) {
  let filename = options.path

  if (!filename) {
    try {
      filename = decodeURI(new URL(c.request.url).pathname)
    } catch {
      return
    }
  }

  if (!options.path && options.rewriteRequestPath) {
    filename = options.rewriteRequestPath(filename)
  }

  return getFilePathWithoutDefaultDocument({
    filename,
    root: options.root,
  })
}

function appendTrailingSlash(path: string) {
  if (path.endsWith('/')) {
    return path
  }

  return path + '/'
}

const baseMimes: Record<string, string> = {
  aac: 'audio/aac',
  avi: 'video/x-msvideo',
  avif: 'image/avif',
  av1: 'video/av1',
  bin: 'application/octet-stream',
  bmp: 'image/bmp',
  css: 'text/css',
  csv: 'text/csv',
  eot: 'application/vnd.ms-fontobject',
  epub: 'application/epub+zip',
  gif: 'image/gif',
  gz: 'application/gzip',
  htm: 'text/html',
  html: 'text/html',
  ico: 'image/x-icon',
  ics: 'text/calendar',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  jsonld: 'application/ld+json',
  map: 'application/json',
  mid: 'audio/x-midi',
  midi: 'audio/x-midi',
  mjs: 'text/javascript',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  oga: 'audio/ogg',
  ogv: 'video/ogg',
  ogx: 'application/ogg',
  opus: 'audio/opus',
  otf: 'font/otf',
  pdf: 'application/pdf',
  png: 'image/png',
  rtf: 'application/rtf',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ts: 'video/mp2t',
  ttf: 'font/ttf',
  txt: 'text/plain',
  wasm: 'application/wasm',
  webm: 'video/webm',
  weba: 'audio/webm',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  xhtml: 'application/xhtml+xml',
  xml: 'application/xml',
  zip: 'application/zip',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  gltf: 'model/gltf+json',
  glb: 'model/gltf-binary',
  rsc: 'text/x-component',
}

export const getMimeType = (
  filename: string,

  mimes2?: Record<string, string>,
): string | undefined => {
  const regexp = /\.([a-zA-Z0-9]+?)$/
  const match = filename.match(regexp)
  if (!match) {
    return
  }
  let mimeType = mimes2?.[match[1]] ?? baseMimes[match[1]]
  if (
    (mimeType && mimeType.startsWith('text')) ||
    mimeType === 'application/json'
  ) {
    mimeType += '; charset=utf-8'
  }
  return mimeType
}

export const getExtension = (mimeType: string): string | undefined => {
  for (const ext in baseMimes) {
    if (baseMimes[ext] === mimeType) {
      return ext
    }
  }
}

type FilePathOptions = {
  filename: string
  root?: string
  defaultDocument?: string
}

export const getFilePath = (options: FilePathOptions): string | undefined => {
  let filename = options.filename
  const defaultDocument = options.defaultDocument || 'index.html'

  if (filename.endsWith('/')) {
    // /top/ => /top/index.html
    filename = filename.concat(defaultDocument)
  } else if (!filename.match(/\.[a-zA-Z0-9_-]+$/)) {
    // /top => /top/index.html
    filename = filename.concat('/' + defaultDocument)
  }

  const path = getFilePathWithoutDefaultDocument({
    root: options.root,
    filename,
  })

  return path
}

export const getFilePathWithoutDefaultDocument = (
  options: Omit<FilePathOptions, 'defaultDocument'>,
): string | undefined => {
  let root = options.root || ''
  let filename = options.filename

  if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
    return
  }

  // /foo.html => foo.html
  filename = filename.replace(/^\.?[\/\\]/, '')

  // foo\bar.txt => foo/bar.txt
  filename = filename.replace(/\\/g, '/')

  // assets/ => assets
  root = root.replace(/\/$/, '')

  // ./assets/foo.html => assets/foo.html
  let path = root ? root + '/' + filename : filename
  if (!isAbsolutePath(root)) {
    path = path.replace(/^\.?\//, '')
  }

  return path
}

function isAbsolutePath(path: string) {
  return /^(?:[A-Za-z]:)?\//.test(path)
}
