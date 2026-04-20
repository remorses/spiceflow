// Regression tests for ergonomic `AnySpiceflow` fallbacks across public typed APIs.
import { z } from 'zod'
import { expect, test } from 'vitest'

import { createSpiceflowClient, createSpiceflowFetch } from './client/index.ts'
import { getRouter, redirect, useLoaderData, useRouterState } from './react/index.ts'
import { AnySpiceflow, createHref, Spiceflow } from './spiceflow.tsx'
import type { IsAny } from './types.ts'

test('SpiceflowRegister: router import is typed via register pattern', () => {
  // Tests the register mechanism by importing the typed `router` export directly.
  // In real apps, users add `declare module 'spiceflow/react' { ... }` once
  // and then import { router } everywhere without generics.
  // Here we use the explicit generic to prove the overload works without
  // polluting other tests with a module augmentation.
  const app = new Spiceflow()
    .page('/login', async () => 'login')
    .page('/dashboard', async () => 'dashboard')
    .loader('/users/:id', async ({ params }) => ({ user: { id: params.id } }))
    .page('/users/:id', async () => 'user')
    .page('/settings', async () => 'settings')
    .page('/orgs/:orgId/projects/:projectId', async () => 'project')

  const typedRouter = getRouter<typeof app>()

  // Path validation works
  // @ts-expect-error - invalid path rejected
  typedRouter.href('/nonexistent')

  // @ts-expect-error - missing required params rejected
  typedRouter.href('/users/:id')

  // @ts-expect-error - wrong param key rejected
  typedRouter.href('/users/:id', { slug: '1' })

  // Valid paths accepted
  expect(typedRouter.href('/login')).toBe('/login')
  expect(typedRouter.href('/dashboard')).toBe('/dashboard')
  expect(typedRouter.href('/settings')).toBe('/settings')
  expect(typedRouter.href('/users/:id', { id: '42' })).toBe('/users/42')
  expect(
    typedRouter.href('/orgs/:orgId/projects/:projectId', { orgId: 'a', projectId: 'b' }),
  ).toBe('/orgs/a/projects/b')
})

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
  const routerApi = getRouter<AnySpiceflow>()

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
    const data = useLoaderData<AnySpiceflow>()
    const dataIsAny: IsAny<typeof data> = true
    void dataIsAny
    data.session.user.name
    return null
  }

  function PathLoaderDataComponent() {
    const data = useLoaderData<AnySpiceflow>('/runtime-route')
    const dataIsAny: IsAny<typeof data> = true
    void dataIsAny
    data.session.user.name
    return null
  }

  function UntypedRouterStateComponent() {
    const state = useRouterState<AnySpiceflow>()
    state.pathname.toUpperCase()
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
  UntypedRouterStateComponent
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

  const strictRouter = getRouter<typeof app>()
  const noLoaderRouter = getRouter<typeof noLoaderApp>()

  expect(strictRouter.href('/users/:id', { id: '1', tab: 'profile' })).toBe(
    '/users/1?tab=profile',
  )
  expect(noLoaderRouter.href('/plain', { mode: 'preview' })).toBe(
    '/plain?mode=preview',
  )

  // @ts-expect-error - wrong route param key must stay rejected
  strictRouter.href('/users/:id', { slug: '1' })

  // @ts-expect-error - invalid query key must stay rejected for typed routes
  noLoaderRouter.href('/plain', { wrong: 'x' })

  // @ts-expect-error - invalid route literal must stay rejected for typed routes
  noLoaderRouter.href('/missing')

  function StrictLoaderDataComponent() {
    const data = useLoaderData<typeof app>('/users/:id')
    data.user.id
    // @ts-expect-error - typed loader data must not widen to any
    data.user.missing
    return null
  }

  function NoLoaderDataComponent() {
    const data = useLoaderData<typeof noLoaderApp>('/plain')
    // @ts-expect-error - no-loader routes must not widen to any
    data.anything
    return null
  }

  function StrictRouterStateComponent() {
    const state = useRouterState<typeof app>()
    state.searchParams.get('tab')
    // @ts-expect-error - router state searchParams must stay readonly
    state.searchParams.set('tab', 'profile')
    return null
  }

  async function assertStrictGetLoaderData() {
    const data = await strictRouter.getLoaderData('/users/:id')
    data.user.id
    // @ts-expect-error - typed loader data must not widen to any
    data.user.missing

    strictRouter.refresh()
  }

  async function assertNoLoaderGetLoaderData() {
    const data = await noLoaderRouter.getLoaderData('/plain')
    // @ts-expect-error - no-loader routes must not widen to any
    data.anything
  }

  function assertUntypedRouterStillAllowsArbitraryPaths() {
    // Explicit AnySpiceflow to bypass the register and get untyped behavior
    const untypedRouter = getRouter<AnySpiceflow>()
    untypedRouter.href('/anything-at-runtime', { whatever: true })
    void untypedRouter.getLoaderData('/anything-at-runtime')
  }

  StrictLoaderDataComponent
  NoLoaderDataComponent
  StrictRouterStateComponent
  assertStrictGetLoaderData
  assertNoLoaderGetLoaderData
  assertUntypedRouterStillAllowsArbitraryPaths
})

test('getRouter().href() inside handlers for typed redirect', () => {
  // Using getRouter<typeof app> INSIDE handler closures creates a circular
  // type reference: the handler's return type is part of `typeof app`, but
  // the handler also references `typeof app` via getRouter.
  //
  // Result: TypeScript resolves the circularity by widening RoutePaths to
  // `string`, so PATH VALIDATION IS LOST (any string accepted). However,
  // PARAM ENFORCEMENT IS PRESERVED for paths with :param patterns because
  // template literal extraction still works on concrete string literals.
  const app = new Spiceflow()
    .page('/login', async () => 'login')
    .page('/dashboard', async () => {
      // Redirect inside handler to a path defined BEFORE this one
      const router = getRouter<typeof app>()
      const url = router.href('/login')
      return redirect(url)
    })
    .loader('/users/:id', async ({ params }) => {
      // Use getRouter inside a loader to redirect to a path defined AFTER
      const router = getRouter<typeof app>()
      const url = router.href('/settings')
      if (!params.id) throw redirect(url)
      return { user: { id: params.id } }
    })
    .page('/users/:id', async () => 'user')
    .page('/settings', async () => 'settings')
    .page('/orgs/:orgId/projects/:projectId', async () => {
      // Redirect to a parameterized sibling path from inside a handler
      const router = getRouter<typeof app>()
      const url = router.href('/users/:id', { id: '123' })
      return redirect(url)
    })

  const router = getRouter<typeof app>()

  // Runtime assertions still pass
  expect(router.href('/login')).toBe('/login')
  expect(router.href('/settings')).toBe('/settings')
  expect(router.href('/users/:id', { id: '42' })).toBe('/users/42')
  expect(router.href('/orgs/:orgId/projects/:projectId', { orgId: 'a', projectId: 'b' })).toBe(
    '/orgs/a/projects/b',
  )

  // PATH VALIDATION IS LOST due to circular type — these are accepted:
  router.href('/nonexistent') // would be rejected without circularity
  router.href('/totally/bogus/path') // would be rejected without circularity

  // PARAM ENFORCEMENT IS PRESERVED — template literal extraction still works:
  // @ts-expect-error - missing required params is still caught
  router.href('/users/:id')

  // @ts-expect-error - wrong param key is still caught
  router.href('/users/:id', { slug: '1' })
})

test('getRouter() with pre-declared type avoids circular widening', () => {
  // Workaround: define the app without getRouter in handlers, then use the
  // type externally. This avoids circular inference and preserves full path validation.
  const app = new Spiceflow()
    .page('/login', async () => 'login')
    .page('/dashboard', async () => 'dashboard')
    .loader('/users/:id', async ({ params }) => ({ user: { id: params.id } }))
    .page('/users/:id', async () => 'user')
    .page('/settings', async () => 'settings')
    .page('/orgs/:orgId/projects/:projectId', async () => 'project')

  type App = typeof app
  const router = getRouter<App>()

  // PATH VALIDATION IS PRESERVED — no circularity
  // @ts-expect-error - invalid path correctly rejected
  router.href('/nonexistent')

  // @ts-expect-error - missing required params correctly rejected
  router.href('/users/:id')

  // @ts-expect-error - wrong param key correctly rejected
  router.href('/users/:id', { slug: '1' })

  // Valid paths work fine
  expect(router.href('/login')).toBe('/login')
  expect(router.href('/settings')).toBe('/settings')
  expect(router.href('/users/:id', { id: '42' })).toBe('/users/42')
})



test('overlapping loaders merge into typed router data', () => {
  const app = new Spiceflow()
    .loader('/*', async () => ({ session: { user: { name: 'Ada' } } }))
    .loader('/users/:id', async ({ params }) => ({ profile: { id: params.id } }))
    .page('/users/:id', async () => 'user')

  const router = getRouter<typeof app>()

  function MergedLoaderDataComponent() {
    const data = useLoaderData<typeof app>('/users/:id')
    data.session.user.name
    data.profile.id
    // @ts-expect-error - merged loader data must stay narrow
    data.profile.slug
    return null
  }

  async function assertMergedGetLoaderData() {
    const data = await router.getLoaderData('/users/:id')
    data.session.user.name
    data.profile.id
    // @ts-expect-error - merged loader data must stay narrow
    data.session.user.email
  }

  MergedLoaderDataComponent
  assertMergedGetLoaderData
})
