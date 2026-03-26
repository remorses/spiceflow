// Typed router utilities factory. Binds the App type once so path/query/loader
// types are inferred automatically from the app definition.
//
//   const { router, useRouterState, useLoaderData, getLoaderData, href } = createRouter<typeof app>()
//   router.push(href('/users/:id', { id: '123' }))
'use client'

import { useFlightData } from './context.js'
import type {
  MetadataBase,
  MergedLoaderData,
  AllLoaderData,
  ExtractParamsFromPath,
  HrefArgs,
} from '../types.js'
import { router, useRouterState } from './router.js'
import { buildHref } from './loader-utils.js'

type LoaderDataReturn<
  LD extends object,
  Path extends string,
> = string extends Path ? AllLoaderData<LD> : MergedLoaderData<LD, Path>

export function createRouter<
  App extends {
    _types: {
      RoutePaths: string
      RouteQuerySchemas: object
      Metadata: MetadataBase
    }
  },
>() {
  type Paths = App['_types']['RoutePaths']
  type QS = App['_types']['RouteQuerySchemas']
  type LD = App['_types']['Metadata']['loaderData']

  function href<
    const Path extends Paths,
    const Params extends
      ExtractParamsFromPath<Path> = ExtractParamsFromPath<Path>,
  >(path: Path, ...rest: HrefArgs<Paths, QS, Path, Params>): string {
    return buildHref(path, rest[0] as Record<string, any> | undefined)
  }

  function useLoaderData<const Path extends Paths | (string & {}) = string>(
    _path?: Path,
  ): LoaderDataReturn<LD, Path> {
    const flightData = useFlightData()
    return (flightData?.loaderData ?? {}) as any
  }

  function getLoaderData<const Path extends Paths | (string & {}) = string>(
    _path?: Path,
  ): Promise<LoaderDataReturn<LD, Path>> {
    return router.getLoaderData() as any
  }

  return { router, useRouterState, useLoaderData, getLoaderData, href }
}
