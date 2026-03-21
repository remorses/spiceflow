---
'spiceflow': minor
---

Add `.loader()` route kind for server-side data loading, `createRouter<App>()` factory for type-safe client utilities, and rename `safePath` to `href` across the API.

**Loaders** run before page and layout handlers. Their return values are merged by path specificity and passed to handlers via `ctx.loaderData`. Wildcard patterns like `/*` match all routes for global data loading (e.g. auth). Loader data types accumulate in the existing `Metadata` generic.

**`createRouter<typeof app>()`** returns typed `router`, `useRouterState`, `useLoaderData`, and `href` — all in one factory call. Path is always inferred from the argument.

**`safePath` → `href`** renamed on both `app.href()` and `createHref()`. The old `createSafePath` and `buildSafePath` exports are removed.

```ts
// server
const app = new Spiceflow()
  .loader('/*', async () => ({ user: await getUser() }))
  .page('/dashboard', (ctx) => <Dashboard user={ctx.loaderData.user} />)
```

```ts
// client
import { createRouter } from 'spiceflow/react'
export const { router, useLoaderData, href } = createRouter<typeof app>()

router.push('/dashboard')                       // typed paths + params
const { user } = useLoaderData('/dashboard')    // typed, Path inferred
href('/users/:id', { id: '123' })               // type-safe URL builder
```
