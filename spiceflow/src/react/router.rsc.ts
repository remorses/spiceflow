import type { Location } from 'history'
import { getBasePath } from '../base-path.js'
import type { AnySpiceflow } from '../spiceflow.js'
import type { ExtractParamsFromPath } from '../types.js'
import { getRouterContext } from '#router-context'
import { buildHref } from './loader-utils.js'
import type {
  LoaderDataForPath,
  RegisteredApp,
  RouterBase,
  RouterPathArg,
} from './router.js'

const basePath = getBasePath()
const noop = () => undefined

export type ReadonlyURLSearchParams = Omit<
  URLSearchParams,
  'append' | 'delete' | 'set' | 'sort'
>

function hasBasePrefix(path: string, base: string): boolean {
  if (path === base) return true
  const next = path.charAt(base.length)
  return path.startsWith(base) && (next === '/' || next === '?' || next === '#')
}

function stripBase(pathname: string): string {
  if (!basePath) return pathname
  if (hasBasePrefix(pathname, basePath)) {
    return pathname.slice(basePath.length) || '/'
  }
  return pathname
}

function getCurrentLocation(): Location {
  const location = getRouterContext()?.location
  if (location) {
    return location
  }
  return {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: '/',
  }
}

export const router = {
  get location() {
    return getCurrentLocation()
  },
  get pathname() {
    return stripBase(getCurrentLocation().pathname)
  },
  get searchParams(): ReadonlyURLSearchParams {
    return new URLSearchParams(getCurrentLocation().search)
  },
  push(..._args) {
    return undefined
  },
  replace(..._args) {
    return undefined
  },
  go(..._args) {
    return undefined
  },
  back(..._args) {
    return undefined
  },
  forward(..._args) {
    return undefined
  },
  block(..._args) {
    return noop
  },
  refresh: noop,
  subscribe() {
    return noop
  },
  href(path: string, allParams?: Record<string, any>) {
    return buildHref(path, allParams)
  },
  getLoaderData(_path?: string): Promise<Record<string, unknown>> {
    return Promise.resolve(getRouterContext()?.loaderData ?? {})
  },
  __setLoaderData() {},
} as RouterBase<RegisteredApp>

export function useRouterState<_App extends AnySpiceflow = AnySpiceflow>() {
  const location = getCurrentLocation()
  return {
    ...location,
    searchParams: new URLSearchParams(location.search) as ReadonlyURLSearchParams,
  }
}

export function useLoaderData<
  App extends AnySpiceflow = AnySpiceflow,
  const Path extends RouterPathArg<App> = string,
>(_path?: Path): LoaderDataForPath<App, Path> {
  return getRouterContext()?.loaderData as LoaderDataForPath<App, Path>
}

export type { SpiceflowRegister, RegisteredApp } from './router.js'

/** @deprecated Use `import { router } from 'spiceflow/react'` directly instead. */
export function getRouter(): RouterBase<RegisteredApp>
/** @deprecated Use `import { router } from 'spiceflow/react'` directly instead. */
export function getRouter<App extends AnySpiceflow>(): RouterBase<App>
export function getRouter(): any {
  return router as any
}
