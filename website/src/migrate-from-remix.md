---
title: Migrating from Remix / React Router to Spiceflow
description: Step-by-step guide to convert a Remix or React Router v7 app to Spiceflow with typed loaders, server actions, and RSC.
icon: arrow-right-left
---

# Migrating from Remix / React Router to Spiceflow

Spiceflow replaces Remix's file-based routing with explicit route registration. The core concepts map directly: loaders stay loaders, actions become server actions, and everything remains type-safe through a register pattern.

This guide covers each piece of a Remix app and shows the clean Spiceflow equivalent.

## Route registration

Remix uses file naming conventions (`routes/dashboard.tsx`, `routes/dashboard._index.tsx`). Spiceflow uses explicit chained methods on a single app instance.

```tsx
// src/main.tsx
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .page('/dashboard', async () => <DashboardPage />)
  .page('/dashboard/settings', async () => <SettingsPage />)
  .get('/api/health', async () => ({ status: 'ok' }))
  .post('/api/webhooks', async ({ request }) => {
    const body = await request.json()
    await processWebhook(body)
    return { success: true }
  })

// Register the app type globally for type-safe routing
declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
```

| Remix | Spiceflow |
|---|---|
| `routes/dashboard.tsx` | `.page('/dashboard', ...)` |
| `routes/api.health.ts` (GET) | `.get('/api/health', ...)` |
| `routes/api.webhooks.ts` (POST) | `.post('/api/webhooks', ...)` |
| `routes/dashboard.tsx` layout | `.layout('/dashboard/*', ...)` |
| Dynamic `$id` segments | `:id` segments |

## Loaders and `useLoaderData`

Spiceflow has first-class `.loader()` support. Data loaded on the server is available in any client component via `useLoaderData()`, fully typed.

### Before (Remix)

```tsx
// routes/dashboard.tsx
import { json, useLoaderData } from 'react-router'

export async function loader({ request }) {
  const user = await getUser(request)
  const projects = await getProjects(user.id)
  return json({ user, projects })
}

export default function Dashboard() {
  const { user, projects } = useLoaderData<typeof loader>()
  return <div>{user.name} has {projects.length} projects</div>
}
```

### After (Spiceflow)

```tsx
// src/main.tsx
import { Spiceflow } from 'spiceflow'
import { DashboardPage } from './app/dashboard-page'

export const app = new Spiceflow()
  .loader('/dashboard', async ({ request }) => {
    const user = await getUser(request)
    const projects = await getProjects(user.id)
    return { user, projects }
  })
  .page('/dashboard', async () => <DashboardPage />)

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
```

```tsx
// src/app/dashboard-page.tsx
'use client'

import { useLoaderData } from 'spiceflow/react'

export function DashboardPage() {
  const { user, projects } = useLoaderData('/dashboard')
  //      ^--- fully typed from the loader return value
  return <div>{user.name} has {projects.length} projects</div>
}
```

The type safety comes from the `declare module` register at the bottom of your app entry. TypeScript infers the loader return type from your code and maps it to the route path, so `useLoaderData('/dashboard')` knows the exact shape without generics or `typeof loader`.

### Nested loaders

Remix nests loaders by file hierarchy. Spiceflow nests loaders by path pattern. Wildcard loaders run for all child routes, and data is merged by specificity.

```tsx
export const app = new Spiceflow()
  // Runs for /dashboard and all /dashboard/* routes
  .loader('/dashboard/*', async ({ request }) => {
    const user = await getUser(request)
    return { user }
  })
  // Runs only for /dashboard/projects/:id/*
  .loader('/dashboard/projects/:id/*', async ({ params }) => {
    const project = await getProject(params.id)
    return { project }
  })
  .layout('/dashboard/*', async ({ children }) => {
    return <DashboardShell>{children}</DashboardShell>
  })
  .page('/dashboard/projects/:id', async () => {
    return <ProjectPage />
  })
```

Any client component can call `useLoaderData` at any depth. No prop drilling needed.

```tsx
'use client'
import { useLoaderData } from 'spiceflow/react'

export function ProjectHeader() {
  // Read data from two different loader levels
  const { user } = useLoaderData('/dashboard/*')
  const { project } = useLoaderData('/dashboard/projects/:id/*')
  return <h1>{project.name} — {user.name}</h1>
}
```

## Auth guards

Loaders can throw `redirect()` to protect routes, same as Remix.

```tsx
// Remix
export async function loader({ request }) {
  const user = await getUser(request)
  if (!user) return redirect('/login')
  return json({ user })
}

// Spiceflow
.loader('/dashboard/*', async ({ request, redirect }) => {
  const user = await getUser(request)
  if (!user) throw redirect('/login')
  return { user }
})
```

The key difference: Spiceflow uses `throw redirect()` (not `return`). Throwing short-circuits the entire request immediately.

## Form actions → Server actions

This is the biggest change. Remix uses `action()` exports with `<Form>` from react-router, `useActionData()`, and `useNavigation()`. Spiceflow uses React 19 server actions with `<form action>`, `useActionState`, and `useFormStatus`.

### Before (Remix)

```tsx
// routes/contact.tsx
import { Form, useActionData, useNavigation } from 'react-router'

export async function action({ request }) {
  const form = await request.formData()
  const email = form.get('email')
  const result = await subscribe(email)
  if (result.error) return json({ error: result.error }, { status: 400 })
  return redirect('/thank-you')
}

export default function ContactPage() {
  const actionData = useActionData<typeof action>()
  const nav = useNavigation()
  const isLoading = nav.state !== 'idle'

  return (
    <Form method="post">
      <input name="email" type="email" required />
      <button disabled={isLoading}>
        {isLoading ? 'Subscribing...' : 'Subscribe'}
      </button>
      {actionData?.error && <p className="text-red-500">{actionData.error}</p>}
    </Form>
  )
}
```

### After (Spiceflow)

Define the action in a `"use server"` file and import it directly in the client component. No prop drilling needed.

```tsx
// src/actions.ts
'use server'

import { z } from 'zod'
import { parseFormData, redirect } from 'spiceflow'

const subscribeSchema = z.object({ email: z.string().email() })

export async function subscribeAction(
  prev: { error: string } | null,
  formData: FormData,
) {
  const { email } = parseFormData(subscribeSchema, formData)
  const result = await subscribe(email)
  if (result.error) return { error: result.error }
  throw redirect('/thank-you')
}
```

```tsx
// src/main.tsx
export const app = new Spiceflow()
  .page('/contact', async () => <ContactForm />)
```

```tsx
// src/app/contact-form.tsx
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { ErrorBoundary } from 'spiceflow/react'
import { subscribeAction } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Subscribing...' : 'Subscribe'}
    </button>
  )
}

export function ContactForm() {
  const [state, formAction] = useActionState(subscribeAction, null)

  return (
    <ErrorBoundary
      below
      fallback={
        <div className="text-red-500">
          <ErrorBoundary.ErrorMessage />
          <ErrorBoundary.ResetButton>Try again</ErrorBoundary.ResetButton>
        </div>
      }
    >
      <form action={formAction}>
        <input name="email" type="email" required />
        <SubmitButton />
        {state?.error && <p className="text-red-500">{state.error}</p>}
      </form>
    </ErrorBoundary>
  )
}
```

### What changed

| Remix | Spiceflow |
|---|---|
| `export async function action()` | `"use server"` file, imported directly in components |
| `<Form method="post">` | `<form action={formAction}>` |
| `useActionData()` | `useActionState(action, initialState)` |
| `useNavigation().state !== 'idle'` | `useFormStatus().pending` |
| `return json({ error })` in action | `return { error }` (plain object) |
| `return redirect('/path')` in action | `throw redirect('/path')` |
| Manual error display | `ErrorBoundary` from `spiceflow/react` catches throws |

### Validation with `parseFormData`

Spiceflow provides `parseFormData(schema, formData)` which validates form fields against a Zod schema. It throws a `ValidationError` on failure, which `ErrorBoundary` catches automatically. No manual error handling needed for validation.

```tsx
import { z } from 'zod'
import { parseFormData } from 'spiceflow'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
})
const fields = schema.keyof().enum  // type-safe input names

// In a form:
<input name={fields.email} type="email" />
<input name={fields.name} />
```

Using `schema.keyof().enum` for input `name` attributes means typos become compile errors.

## Layouts

Remix layout routes (`_layout.tsx`, pathless layouts) become `.layout()` calls.

```tsx
// Remix: routes/_app.tsx wraps all routes/_app.*.tsx children
// Spiceflow:
export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <body>
          <ProgressBar />
          <nav>...</nav>
          {children}
          <footer>...</footer>
        </body>
      </html>
    )
  })
  .layout('/app/*', async ({ children, loaderData }) => {
    return <AppShell user={loaderData.user}>{children}</AppShell>
  })
```

Wildcard layouts match their base path too, so `/app/*` wraps both `/app` and `/app/settings`.

When the URL doesn't match any `.page()`, `children` is `null` in the layout. Render a custom 404:

```tsx
.layout('/*', async ({ children }) => {
  return <AppLayout>{children ?? <NotFound />}</AppLayout>
})
```

## Redirects

```tsx
// Remix
import { redirect } from 'react-router'
return redirect('/login')
return redirect('/login', { headers })

// Spiceflow (in loaders, page handlers, server actions)
throw redirect('/login')
throw redirect('/login', { headers: { 'Set-Cookie': '...' } })
```

Always **throw** redirects in Spiceflow, never return them.

## Sub-app mounting

Remix doesn't have a direct equivalent. Spiceflow lets you compose multiple apps with `.use()`:

```tsx
import { Spiceflow } from 'spiceflow'

const apiApp = new Spiceflow({ basePath: '/api' })
  .get('/users', async () => getUsers())
  .post('/users', async ({ request }) => createUser(await request.json()))

const mainApp = new Spiceflow()
  .page('/', async () => <Home />)
  .use(apiApp)  // mounts at /api/*
```

## Links and navigation

```tsx
// Remix
import { Link, useNavigate } from 'react-router'
<Link to="/dashboard">Dashboard</Link>

// Spiceflow
import { Link, router } from 'spiceflow/react'
<Link href={router.href('/dashboard')}>Dashboard</Link>

// Type-safe dynamic paths
<Link href={router.href('/users/:id', { id: '42' })}>User 42</Link>

// Programmatic navigation
router.push('/dashboard')
router.replace('/settings')
```

`router.href()` validates paths against the route table at compile time. If you rename a route, every stale `href()` call becomes a TypeScript error.

## Import replacement reference

| Remix / React Router import | Spiceflow replacement |
|---|---|
| `useLoaderData` from `react-router` | `useLoaderData` from `spiceflow/react` |
| `useActionData` | `useActionState` from `react` |
| `useNavigation` | `useFormStatus` from `react-dom` |
| `Form` from `react-router` | `<form action={serverAction}>` |
| `useSearchParams` | Props from `.page()` handler, or `useRouterState` |
| `redirect` from `react-router` | `redirect` from `spiceflow` |
| `json` / `data` from `react-router` | `json` from `spiceflow` (typed) |
| `Link` from `react-router` | `Link` from `spiceflow/react` |
| `href` from `react-router` | `router.href()` from `spiceflow/react` |
| `useParams` | `useLoaderData` (params available in loaders) |
| `useSubmit` | Server actions called directly |
| `useFetcher` | Server actions + `useTransition` |

## Reusable actions with `"use server"` files

For actions used by multiple pages, put them in a dedicated `"use server"` file instead of defining them inline. This keeps action logic centralized and testable.

```tsx
// src/actions.ts
'use server'

import { z } from 'zod'
import { parseFormData, redirect } from 'spiceflow'
import { getActionRequest } from 'spiceflow'
import { router } from 'spiceflow/react'

export const postSchema = z.object({ title: z.string().min(1) })

export async function createPost(formData: FormData) {
  const { signal } = getActionRequest()
  const { title } = parseFormData(postSchema, formData)
  const post = await db.posts.create({ title }, { signal })
  // router.href is type-safe in standalone action files
  throw redirect(router.href('/posts/:id', { id: post.id }))
}
```

`getActionRequest()` gives access to the request `signal`, which is aborted when the client disconnects. Pass it to downstream work so long operations cancel automatically.

On the client, `getActionAbortController()` from `spiceflow/react` lets users cancel in-flight actions.

## Query params with typed schemas

Spiceflow lets you define a `query` schema on pages using the object notation. This gives you typed query access and compile-time validation on `router.href()`.

```tsx
// Remix
const [searchParams] = useSearchParams()
const q = searchParams.get('q') || ''

// Spiceflow
.page({
  path: '/search',
  query: z.object({
    q: z.string(),
    page: z.coerce.number().optional(),
  }),
  handler: async ({ query }) => {
    // query.q is string, query.page is number | undefined
    const results = await search(query.q, query.page)
    return <SearchResults results={results} />
  },
})
```

Links to pages with query schemas are validated at compile time:

```tsx
<Link href={router.href('/search', { q: 'docs', page: 2 })}>Search</Link>
// @ts-expect-error — 'color' is not in the schema
<Link href={router.href('/search', { color: 'red' })}>Red</Link>
```

## Streaming with Suspense

Remix uses `defer()` to stream slow data. Spiceflow uses loaders with unawaited promises. The loader returns immediately, the page renders with a `<Suspense>` fallback, and the slow data streams in via the RSC flight stream.

```tsx
// src/main.tsx
app
  .loader('/dashboard', async ({ request }) => {
    const user = await getUser(request)           // fast, awaited
    const statsPromise = getExpensiveStats()      // slow, NOT awaited
    return { user, statsPromise }
  })
  .page('/dashboard', async ({ loaderData }) => {
    return (
      <div>
        <h1>Welcome {loaderData.user.name}</h1>
        <Suspense fallback={<p>Loading stats...</p>}>
          <HeavyStats statsPromise={loaderData.statsPromise} />
        </Suspense>
      </div>
    )
  })
```

```tsx
// src/app/heavy-stats.tsx
'use client'
import { use } from 'react'

export function HeavyStats({ statsPromise }: { statsPromise: Promise<Stats> }) {
  const stats = use(statsPromise)
  return <div>{stats.totalViews} views</div>
}
```

The page skeleton reaches the browser immediately. When the stats promise resolves on the server, the result is flushed into the same flight stream. No extra HTTP round-trip.

## Not found pages

Spiceflow uses `response.status` to set HTTP status codes, and `children === null` in layouts to detect unmatched routes.

```tsx
// Remix
export function loader() {
  const post = await getPost(id)
  if (!post) throw new Response('Not Found', { status: 404 })
  return json({ post })
}

// Spiceflow
.page('/posts/:id', async ({ params, response }) => {
  const post = await getPost(params.id)
  if (!post) {
    response.status = 404
    return <NotFound message={`Post ${params.id} not found`} />
  }
  return <Post post={post} />
})
```
