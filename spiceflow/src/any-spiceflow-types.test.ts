// Regression tests for ergonomic `AnySpiceflow` fallbacks across public typed APIs.
import { z } from 'zod'
import { expect, test } from 'vitest'

import { createSpiceflowClient, createSpiceflowFetch } from './client/index.ts'
import { createRouter } from './react/index.ts'
import { AnySpiceflow, createHref, Spiceflow } from './spiceflow.tsx'
import type { IsAny } from './types.ts'

test('AnySpiceflow falls back to ergonomic any types', () => {
  const app = new Spiceflow()
    .get('/api/typed', () => ({ ok: true }))
    .loader('/*', async () => ({ session: { user: { name: 'Tommy' } } }))
    .page('/', async () => 'home')
  const anyApp = app as AnySpiceflow

  const fetchClient = createSpiceflowFetch<AnySpiceflow>('http://localhost:3000')
  const fetchFromApp = createSpiceflowFetch(anyApp)
  const proxyClient = createSpiceflowClient<AnySpiceflow>('http://localhost:3000')
  const proxyClientFromApp = createSpiceflowClient(anyApp)
  const href = createHref<AnySpiceflow>()
  const routerApi = createRouter<AnySpiceflow>()

  function assertFetchFallbackTypes() {
    const result = fetchClient('/runtime-route', {
      method: 'POST',
      body: { arbitrary: true },
      query: { search: 'hello' },
      params: { id: '1' },
    })
    const resultIsAny: IsAny<Awaited<typeof result>> = true
    void resultIsAny

    async function readResult() {
      const value = await result
      value.deep.property
    }

    readResult
  }

  function assertFetchFromAppFallbackTypes() {
    const result = fetchFromApp('/runtime-route', {
      method: 'PATCH',
      body: { nested: { okay: true } },
      query: { page: 1 },
      params: { slug: 'docs' },
    })
    const resultIsAny: IsAny<Awaited<typeof result>> = true
    void resultIsAny

    async function readResult() {
      const value = await result
      value.anything.at.all
    }

    readResult
  }

  function assertProxyClientFallbackTypes() {
    const result = proxyClient.api.runtime.route.post(
      { arbitrary: true },
      { query: { search: 'hello' } },
    )
    const dataIsAny: IsAny<Awaited<typeof result>['data']> = true
    void dataIsAny

    result.then((value) => {
      value.data.deep.property
      value.error?.value?.deep?.property
    })
  }

  function assertProxyClientFromAppFallbackTypes() {
    const result = proxyClientFromApp.api.runtime.route.get({
      query: { search: 'hello' },
    })
    const dataIsAny: IsAny<Awaited<typeof result>['data']> = true
    void dataIsAny

    result.then((value) => {
      value.data.deep.property
    })
  }

  function GlobalLoaderDataComponent() {
    const data = routerApi.useLoaderData()
    const dataIsAny: IsAny<typeof data> = true
    void dataIsAny
    data.session.user.name
    return null
  }

  function PathLoaderDataComponent() {
    const data = routerApi.useLoaderData('/runtime-route')
    const dataIsAny: IsAny<typeof data> = true
    void dataIsAny
    data.session.user.name
    return null
  }

  async function assertGetLoaderDataFallbackTypes() {
    const data = await routerApi.getLoaderData()
    const dataIsAny: IsAny<typeof data> = true
    void dataIsAny
    data.session.user.name
  }

  async function assertGetLoaderDataWithPathFallbackTypes() {
    const data = await routerApi.getLoaderData('/runtime-route')
    const dataIsAny: IsAny<typeof data> = true
    void dataIsAny
    data.session.user.name
  }

  assertFetchFallbackTypes
  assertFetchFromAppFallbackTypes
  assertProxyClientFallbackTypes
  assertProxyClientFromAppFallbackTypes
  GlobalLoaderDataComponent
  PathLoaderDataComponent
  assertGetLoaderDataFallbackTypes
  assertGetLoaderDataWithPathFallbackTypes

  expect(href('/runtime-route', { slug: 'docs', page: 1 })).toBe(
    '/runtime-route?slug=docs&page=1',
  )
  expect(anyApp.href('/runtime-route', { slug: 'docs', page: 1 })).toBe(
    '/runtime-route?slug=docs&page=1',
  )
})

test('strict app router types stay narrow', () => {
  const app = new Spiceflow()
    .loader('/users/:id', async ({ params }) => ({ user: { id: params.id } }))
    .page({
      path: '/users/:id',
      query: z.object({ tab: z.string().optional() }),
      handler: async () => 'user',
    })

  const noLoaderApp = new Spiceflow().page({
    path: '/plain',
    query: z.object({ mode: z.string().optional() }),
    handler: async () => 'plain',
  })

  const strictRouter = createRouter<typeof app>()
  const noLoaderRouter = createRouter<typeof noLoaderApp>()

  expect(strictRouter.href('/users/:id', { id: '1', tab: 'profile' })).toBe(
    '/users/1?tab=profile',
  )
  expect(noLoaderRouter.href('/plain', { mode: 'preview' })).toBe(
    '/plain?mode=preview',
  )

  // @ts-expect-error - invalid query key must stay rejected for typed routes
  noLoaderRouter.href('/plain', { wrong: 'x' })

  // @ts-expect-error - invalid route literal must stay rejected for typed routes
  noLoaderRouter.href('/missing')

  function StrictLoaderDataComponent() {
    const data = strictRouter.useLoaderData('/users/:id')
    data.user.id
    // @ts-expect-error - typed loader data must not widen to any
    data.user.missing
    return null
  }

  function NoLoaderDataComponent() {
    const data = noLoaderRouter.useLoaderData('/plain')
    // @ts-expect-error - no-loader routes must not widen to any
    data.anything
    return null
  }

  async function assertStrictGetLoaderData() {
    const data = await strictRouter.getLoaderData('/users/:id')
    data.user.id
    // @ts-expect-error - typed loader data must not widen to any
    data.user.missing
  }

  async function assertNoLoaderGetLoaderData() {
    const data = await noLoaderRouter.getLoaderData('/plain')
    // @ts-expect-error - no-loader routes must not widen to any
    data.anything
  }

  StrictLoaderDataComponent
  NoLoaderDataComponent
  assertStrictGetLoaderData
  assertNoLoaderGetLoaderData
})
