import { getBasePath } from '../base-path.js'
import type {
  AllHrefPaths,
  ExtractParamsFromPath,
  PathParamsProp,
} from '../types.js'
import { buildHref } from './loader-utils.js'
import type { RegisteredApp, RouterPaths } from './router.js'

export interface ReactServerErrorContext {
  status: number
  headers?: Record<string, string> | [string, string][]
}

type RedirectOptions = {
  status?: number
  headers?: Record<string, string>
}

type RedirectParamsOptions<Path extends string> = RedirectOptions &
  PathParamsProp<Path>

type RedirectArgs<Path extends string> = [ExtractParamsFromPath<Path>] extends [undefined]
  ? [options?: RedirectParamsOptions<Path>]
  : [options: RedirectParamsOptions<Path>]

type RedirectAnyOptions = RedirectOptions & {
  params?: Record<string, string | number | boolean>
}

type ExternalRedirectLocation =
  | `${string}://${string}`
  | `//${string}`
  | `?${string}`
  | `#${string}`

type UnionToIntersection<U> =
  (U extends any ? (value: U) => void : never) extends (value: infer I) => void
    ? I
    : never

type RedirectPatternOverloads<Paths extends string> = UnionToIntersection<
  {
    [Path in Paths]: (location: Path, ...rest: RedirectArgs<Path>) => Response
  }[Paths]
>

type RedirectResolvedOverload<Paths extends string> = <
  Location extends AllHrefPaths<Paths>,
>(
  location: Location extends Paths ? never : Location,
  ...rest: RedirectArgs<Location>
) => Response

type DynamicStringRedirect = <Location extends string>(
  location: string extends Location ? Location : never,
  options?: RedirectAnyOptions,
) => Response

type RedirectFn = string extends RouterPaths<RegisteredApp>
  ? (location: string, options?: RedirectAnyOptions) => Response
  : RedirectPatternOverloads<RouterPaths<RegisteredApp>> &
      RedirectResolvedOverload<RouterPaths<RegisteredApp>> &
      DynamicStringRedirect &
      ((location: ExternalRedirectLocation, options?: RedirectOptions) => Response)

// Normalizes headers from either Record or entries array into a plain
// object. Used when reading headers from decoded digest contexts where
// we only need single-value access (e.g. checking the location header).
export function contextHeaders(
  ctx: ReactServerErrorContext,
): Record<string, string> {
  if (!ctx.headers) return {}
  if (Array.isArray(ctx.headers)) {
    return Object.fromEntries(ctx.headers)
  }
  return ctx.headers
}

// Normalizes headers from a decoded digest context into a Headers object,
// preserving duplicate keys like set-cookie.
export function contextToHeaders(ctx: ReactServerErrorContext): Headers {
  if (!ctx.headers) return new Headers()
  if (Array.isArray(ctx.headers)) return new Headers(ctx.headers)
  return new Headers(Object.entries(ctx.headers))
}

function hasBasePrefix(path: string, base: string): boolean {
  if (path === base) return true
  const next = path.charAt(base.length)
  return path.startsWith(base) && (next === '/' || next === '?' || next === '#')
}

const redirectImpl = (location: string, options?: RedirectAnyOptions) => {
  const [target, resolvedOptions] = options?.params
    ? [buildHref(location, options.params), options]
    : [location, options]

  const base = getBasePath()
  // Auto-prepend base path to absolute redirect targets so user code
  // can write redirect("/dashboard") without worrying about base config.
  if (
    base &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !hasBasePrefix(target, base)
  ) {
    return new Response(null, {
      status: resolvedOptions?.status ?? 307,
      headers: {
        ...resolvedOptions?.headers,
        location: base + target,
      },
    })
  }

  return new Response(null, {
    status: resolvedOptions?.status ?? 307,
    headers: {
      ...resolvedOptions?.headers,
      location: target,
    },
  })
}

export const redirect: RedirectFn = redirectImpl

export function notFound() {
  return new Response(null, { status: 404 })
}

export function isRedirectError(ctx?: ReactServerErrorContext) {
  if (!ctx) return false
  const headers = contextHeaders(ctx)
  const location = headers['location']
  if (300 <= ctx.status && ctx.status <= 399 && typeof location === 'string') {
    return { location }
  }
  return false
}

export function isRedirectStatus(status: number) {
  return 300 <= status && status <= 399
}

export function isNotFoundError(ctx?: ReactServerErrorContext) {
  if (!ctx) return false
  return ctx.status === 404
}

// Decodes the digest string from React's flight stream back into a
// ReactServerErrorContext. The RSC onError encodes thrown Responses as
// "__REACT_SERVER_ERROR__:{status,headers}" digest strings, and the SSR
// layer uses this function to recover the original status/headers.
export function getErrorContext(
  error: unknown,
): ReactServerErrorContext | undefined {
  if (!(error instanceof Error)) return

  const digest = Reflect.get(error, 'digest')
  if (typeof digest !== 'string') return

  const m = digest.match(/^__REACT_SERVER_ERROR__:(.*)$/)
  if (m && m[1]) {
    try {
      return JSON.parse(m[1])
    } catch (e) {
      console.error(e)
    }
  }

  return
}
