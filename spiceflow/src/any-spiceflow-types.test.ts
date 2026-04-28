// Regression tests for ergonomic `AnySpiceflow` fallbacks across public typed APIs.
import { rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { expect, test } from 'vitest'
import ts from 'typescript'

import { createSpiceflowClient, createSpiceflowFetch } from './client/index.ts'
import { getRouter, Link, redirect, useLoaderData, useRouterState } from './react/index.ts'
import type { LinkProps } from './react/index.ts'
import { AnySpiceflow, createHref, Spiceflow } from './spiceflow.tsx'
import type { AllHrefPaths, IsAny } from './types.ts'

function getDiagnosticsForSnippet(source: string) {
  const srcDir = dirname(new URL(import.meta.url).pathname)
  const tsconfigPath = join(srcDir, '..', 'tsconfig.json')
  const snippetPath = join(srcDir, '__tmp-redirect-register-check.ts')

  writeFileSync(snippetPath, source)

  try {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      dirname(tsconfigPath),
      { noEmit: true },
      tsconfigPath,
    )
    const program = ts.createProgram({
      rootNames: [snippetPath],
      options: parsedConfig.options,
    })

    return ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => diagnostic.file?.fileName === snippetPath)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  } finally {
    rmSync(snippetPath)
  }
}

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
  const anyApp: AnySpiceflow = app

  // No-generic versions use RegisteredApp which falls back to AnySpiceflow
  const fetchClient = createSpiceflowFetch('http://localhost:3000')
  const fetchFromApp = createSpiceflowFetch(anyApp)
  const proxyClient = createSpiceflowClient('http://localhost:3000')
  const proxyClientFromApp = createSpiceflowClient(anyApp)
  const href = createHref()
  const routerApi = getRouter()

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
    const data = useLoaderData()
    const dataIsAny: IsAny<typeof data> = false
    void dataIsAny
    void data
    return null
  }

  function PathLoaderDataComponent() {
    const data = useLoaderData('/runtime-route')
    const dataIsAny: IsAny<typeof data> = false
    void dataIsAny
    void data
    return null
  }

  function UntypedRouterStateComponent() {
    const state = useRouterState()
    state.pathname.toUpperCase()
    return null
  }

  async function assertGetLoaderDataFallbackTypes() {
    const data = await routerApi.getLoaderData()
    const dataIsAny: IsAny<typeof data> = false
    void dataIsAny
    void data
  }

  async function assertGetLoaderDataWithPathFallbackTypes() {
    const data = await routerApi.getLoaderData('/runtime-route')
    const dataIsAny: IsAny<typeof data> = false
    void dataIsAny
    void data
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
    const data = useLoaderData<{ user: { id: string } }>('/users/:id')
    data.user.id
    // @ts-expect-error - explicit loader data generic must not widen to any
    data.user.missing
    return null
  }

  function NoLoaderDataComponent() {
    const data = useLoaderData('/plain')
    void data
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
    const data = await strictRouter.getLoaderData<{ user: { id: string } }>('/users/:id')
    data.user.id
    // @ts-expect-error - explicit loader data generic must not widen to any
    data.user.missing

    strictRouter.refresh()
  }

  async function assertNoLoaderGetLoaderData() {
    const data = await noLoaderRouter.getLoaderData('/plain')
    void data
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
    const data = useLoaderData<{
      session: { user: { name: string } }
      profile: { id: string }
    }>('/users/:id')
    data.session.user.name
    data.profile.id
    // @ts-expect-error - explicit loader data must stay narrow
    data.profile.slug
    return null
  }

  async function assertMergedGetLoaderData() {
    const data = await router.getLoaderData<{
      session: { user: { name: string } }
      profile: { id: string }
    }>('/users/:id')
    data.session.user.name
    data.profile.id
    // @ts-expect-error - explicit loader data must stay narrow
    data.session.user.email
  }

  MergedLoaderDataComponent
  assertMergedGetLoaderData
})

test('Link: unregistered app accepts any string href', () => {
  // Without SpiceflowRegister, Link falls back to string (any path works)
  const a: LinkProps = { href: '/anything' }
  const b: LinkProps = { href: '/with/params', params: { id: '1' } }
  const c: LinkProps = { href: '/plain' }
  const d: LinkProps = {}
  void [a, b, c, d]
})

test('Link: typed app validates href paths and requires params', () => {
  const app = new Spiceflow()
    .page('/login', async () => 'login')
    .page('/dashboard', async () => 'dashboard')
    .page('/users/:id', async () => 'user')
    .page('/orgs/:orgId/projects/:projectId', async () => 'project')

  type App = typeof app
  type Paths = App['_types']['RoutePaths']

  // Helper to check LinkProps assignability via function call (catches missing props)
  function expectLink<P extends AllHrefPaths<Paths>>(_props: LinkProps<App, Paths, P>) {}

  // Valid static paths
  expectLink({ href: '/login' as const })
  expectLink({ href: '/dashboard' as const })

  // Valid parameterized paths with required params
  expectLink({ href: '/users/:id' as const, params: { id: '42' } })
  expectLink({ href: '/orgs/:orgId/projects/:projectId' as const, params: { orgId: 'a', projectId: 'b' } })

  // @ts-expect-error - invalid path rejected
  expectLink({ href: '/nonexistent' as const })

  // @ts-expect-error - missing required params rejected
  expectLink({ href: '/users/:id' as const })

  // @ts-expect-error - wrong param key rejected
  expectLink({ href: '/users/:id' as const, params: { slug: '1' } })
})

test('exported redirect accepts plain strings while context redirect is typed', () => {
  const diagnostics = getDiagnosticsForSnippet(`
import { Spiceflow } from './spiceflow.tsx'
import { redirect } from './react/index.ts'

const app = new Spiceflow()
  .page('/login', async () => 'login')
  .page('/users/:id', async ({ redirect: routeRedirect }) => {
    routeRedirect('/login')
    routeRedirect('/users/:id', { params: { id: '42' } })

    // @ts-expect-error missing params
    routeRedirect('/users/:id')

    // @ts-expect-error wrong param key
    routeRedirect('/users/:id', { params: { slug: '1' } })

    // @ts-expect-error invalid literal path
    routeRedirect('/missing')

    return 'user'
  })

declare module './react/router.js' {
  interface SpiceflowRegister {
    app: typeof app
  }
}

redirect('/login')
redirect('/users/:id', { params: { id: '42' } })
const id = '42'
redirect(\`/users/\${id}\`)
redirect('https://example.com')
redirect('/users/:id')
redirect('/users/:id', { params: { slug: '1' } })
redirect('/missing')
`)

  expect(diagnostics).toEqual([])
})
