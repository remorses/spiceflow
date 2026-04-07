// Typed router utilities factory. Binds the App type once so path/query/loader
// types are inferred automatically from the app definition.
//
//   const { router, useRouterState, useLoaderData, getLoaderData, href } = createRouter<typeof app>()
//   router.push(href('/users/:id', { id: '123' }))
'use client'

import type { AnySpiceflow } from '../spiceflow.js'
import { useFlightData } from './context.js'
import type {
  MergedLoaderData,
  AllLoaderData,
  ExtractParamsFromPath,
  HrefArgs,
  IsAny,
} from '../types.js'
import { router, useRouterState } from './router.js'
import { buildHref } from './loader-utils.js'

type LoaderDataReturn<
  LD extends object,
  Path extends string,
> = IsAny<LD> extends true
  ? any
  : string extends Path
    ? AllLoaderData<LD>
    : MergedLoaderData<LD, Path>

export function createRouter<App extends AnySpiceflow>() {
  type IsUntypedApp = IsAny<App['_types']['RoutePaths']>
  type Paths = IsUntypedApp extends true ? string : App['_types']['RoutePaths']
  type QS = IsUntypedApp extends true
    ? Record<string, any>
    : App['_types']['RouteQuerySchemas']
  type LD = App['_types']['Metadata']['loaderData']
  type LoaderDataForPath<Path extends string> = IsUntypedApp extends true
    ? any
    : LoaderDataReturn<LD, Path>

  function coerceLoaderData<const Path extends Paths | (string & {})>(
    data: any,
  ): LoaderDataForPath<Path> {
    return data
  }

  function href<
    const Path extends Paths,
    const Params extends
      ExtractParamsFromPath<Path> = ExtractParamsFromPath<Path>,
  >(path: Path, ...rest: HrefArgs<Paths, QS, Path, Params>): string {
    return buildHref(path, rest[0])
  }

  function useLoaderData<const Path extends Paths | (string & {}) = string>(
    _path?: Path,
  ): LoaderDataForPath<Path> {
    const flightData = useFlightData()
    return coerceLoaderData<Path>(flightData?.loaderData ?? {})
  }

  function getLoaderData<const Path extends Paths | (string & {}) = string>(
    _path?: Path,
  ): Promise<LoaderDataForPath<Path>> {
    return router.getLoaderData().then((data) => coerceLoaderData<Path>(data))
  }

  return { router, useRouterState, useLoaderData, getLoaderData, href }
}
