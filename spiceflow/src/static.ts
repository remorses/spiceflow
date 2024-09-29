import { MiddlewareHandler } from './types.js'
import { isResponse } from './utils.js'

type Env = {}
type Context<E extends Env = Env> = {}
type Data = any

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string

  // path?: string
  mimes?: Record<string, string>
  // rewriteRequestPath?: (path: string) => string
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const DEFAULT_DOCUMENT = 'index.html'
const defaultPathResolve = (path: string) => path

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
  return async (c, next) => {
    let filename = decodeURI(new URL(c.request.url).pathname)
    // filename = options.rewriteRequestPath
    //   ? options.rewriteRequestPath(filename)
    //   : filename
    const root = options.root

    // If it was Directory, force `/` on the end.
    if (!filename.endsWith('/') && options.isDir) {
      const path = getFilePathWithoutDefaultDocument({
        filename,
        root,
      })
      if (path && (await options.isDir(path))) {
        filename = filename + '/'
      }
    }

    let path = getFilePath({
      filename,
      root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    if (!path) {
      return await next()
    }

    const getContent = options.getContent
    const pathResolve = options.pathResolve ?? defaultPathResolve

    path = pathResolve(path)
    let content = await getContent(path, c)

    if (!content) {
      let pathWithOutDefaultDocument = getFilePathWithoutDefaultDocument({
        filename,
        root,
      })
      if (!pathWithOutDefaultDocument) {
        return await next()
      }
      pathWithOutDefaultDocument = pathResolve(pathWithOutDefaultDocument)

      if (pathWithOutDefaultDocument !== path) {
        content = await getContent(pathWithOutDefaultDocument, c)
        if (content) {
          path = pathWithOutDefaultDocument
        }
      }
    }

    if (isResponse(content)) {
      return content
    }

    if (content) {
      let mimeType: string | undefined
      mimeType = getMimeType(path, options.mimes)
      let response = new Response(content)
      if (mimeType) {
        response.headers.set('Content-Type', mimeType)
      }
      return response
    }

    await options.onNotFound?.(path, c)
    await next()
    return
  }
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
  filename = filename.replace(/\\/, '/')

  // assets/ => assets
  root = root.replace(/\/$/, '')

  // ./assets/foo.html => assets/foo.html
  let path = root ? root + '/' + filename : filename
  path = path.replace(/^\.?\//, '')

  return path
}
