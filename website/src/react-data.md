---
$schema: https://holocron.so/frontmatter.json
title: Loaders, forms, actions, and error boundaries
sidebarTitle: Data & Actions
description: Share route data with loaders, stream promises with use(), submit React 19 forms, call server actions, and catch errors with ErrorBoundary.
icon: "lucide:database"
prompt: |
  Write the data and actions guide from @/spiceflow/src/react/router.tsx,
  @/spiceflow/src/react/loader-utils.ts, @/spiceflow/src/parse-form-data.ts,
  @/spiceflow/src/react/error-boundary.tsx, and @/example-forms/.
  Cover loaders, useLoaderData, streaming with use(), forms, server actions, and ErrorBoundary.
---

# Loaders, forms, actions, and error boundaries

## Loaders

Loaders run on the server before page and layout handlers. They solve a common problem: when you need the same data in both server components and client components, or in both a layout and a page, without prop drilling or React context.

Prefer putting route data in loaders when that data is shared by more than one part of the route tree. This keeps fetching in one place, avoids fetching the same data once in a layout and again in a page, and lets React components read the current route data directly instead of receiving long prop chains.

**Use loaders instead of passing route data through props.** Props are still great for local UI state, callbacks, and reusable primitives like `<Button variant="ghost" />`, but route data should usually come from `useLoaderData()`. This avoids prop drilling, keeps components movable, and stays type safe because the hook is inferred from the route loader path.

Split data by route ownership instead of making one parent loader parse every URL. Put data that every dashboard page needs in `/dashboard/*`, data that every project page needs in `/dashboard/projects/:projectId/*`, and page-only data next to the page route. Components can call `useLoaderData()` multiple times when they need data from multiple loader levels.

Calling `useLoaderData()` is cheap. It reads the already-loaded request data from React context, so different components and different React trees can call it directly without causing extra loader executions or extra network requests. Do not centralize loader data into a custom props object just to pass it back down through the tree. That pattern repeats the loader return type by hand and can drift out of sync. Prefer calling `useLoaderData('/route/pattern')` where the data is needed, so TypeScript keeps the component shape linked to the real loader return value.

If a parent layout rarely needs to know a child route param, use the web-standard `URLPattern` API instead of a hand-written regex. This is most useful for parent chrome that must sit above several child layouts, like tabs that span both the sidebar and content frame. Prefer splitting layouts and loaders cleanly so you do not need this pattern in normal route trees.

```tsx
export const app = new Spiceflow()
  .loader('/dashboard/*', async ({ request }) => {
    const projectId = new URLPattern({ pathname: '/dashboard/projects/:projectId/*' })
      .exec(request.url)?.pathname.groups.projectId ?? null

    const user = await getUser(request)

    return { user, projectId }
  })
  .layout('/dashboard/*', async ({ loaderData, children }) => {
    return (
      <DashboardShell>
        {loaderData.projectId && <ProjectTabs projectId={loaderData.projectId} />}
        {children}
      </DashboardShell>
    )
  })
```

Loaders only run for requests that also match a `.page()` or `.layout()`. They are not standalone endpoints. If you want to serve content without rendering a page or layout, use `.get()`, `.route()`, or another API handler instead.

```tsx
export const app = new Spiceflow()
  .page('/login', async () => <Login />)
  // Auth loader for the dashboard route
  .loader('/dashboard', async ({ request, redirect }) => {
    const user = await getUser(request.headers.get('cookie'))
    if (!user) throw redirect('/login')
    return { user }
  })
  // Page-specific loader
  .loader('/dashboard', async () => {
    const stats = await getStats()
    return { stats }
  })
  .layout('/dashboard', async ({ loaderData, children }) => {
    // loaderData.user is available here from the dashboard loader
    return (
      <html>
        <body>
          <nav>{loaderData.user.name}</nav>
          {children}
        </body>
      </html>
    )
  })
  .page('/dashboard', async ({ loaderData }) => {
    // Both loaders matched, data is merged by specificity
    // loaderData = { user: ..., stats: ... }
    return <Dashboard />
  })
```

A Remix-style dashboard can put shared shell data in a parent loader, project data in a nested loader, then page data in loaders placed next to each page. The layout, page, and client components all read from the same request-scoped loader data without threading props through every layer:

```tsx
export const app = new Spiceflow()
  .loader('/dashboard/*', async ({ request }) => {
    const user = await getUser(request)
    const projects = await getProjects(user.id)
    return { user, projects }
  })
  .layout('/dashboard/*', async ({ children }) => {
    return <DashboardShell>{children}</DashboardShell>
  })
  .loader('/dashboard/projects/:projectId/*', async ({ params }) => {
    const project = await getProject(params.projectId)
    const environments = await getProjectEnvironments(params.projectId)
    return { project, environments }
  })
  .loader('/dashboard/projects/:projectId/secrets', async ({ params }) => {
    const secrets = await getSecrets(params.projectId)
    return { secrets }
  })
  .page('/dashboard/projects/:projectId/secrets', async () => {
    return <SecretsPage />
  })

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
```

```tsx
// src/app/dashboard-shell.tsx
'use client'

import { useLoaderData } from 'spiceflow/react'
import type { ReactNode } from 'react'

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, projects } = useLoaderData('/dashboard/*')
  return (
    <div>
      <aside>
        <p>{user.name}</p>
        {projects.map((project) => <a key={project.id} href={project.href}>{project.name}</a>)}
      </aside>
      <main>{children}</main>
    </div>
  )
}
```

```tsx
// src/app/secrets-page.tsx
'use client'

import { useLoaderData } from 'spiceflow/react'

export function SecretsPage() {
  const { project, environments } = useLoaderData('/dashboard/projects/:projectId/*')
  const { secrets } = useLoaderData('/dashboard/projects/:projectId/secrets')

  return (
    <section>
      <h1>{project.name}</h1>
      <p>{environments.length} environments</p>
      <SecretsTable />
    </section>
  )
}

export function SecretsTable() {
  const { secrets } = useLoaderData('/dashboard/projects/:projectId/secrets')
  return secrets.map((secret) => <div key={secret.id}>{secret.name}</div>)
}
```

Prefer this over prop drilling route data through every component:

```tsx
// Avoid this for route data. It grows brittle as pages get deeper.
export function SecretsPage({ project, environments, secrets }) {
  return <SecretsTable secrets={secrets} />
}
```

The loader version is type safe end to end. If you rename `secrets` to `secretRows` in the loader, every `useLoaderData('/dashboard/projects/:projectId/secrets')` call that still reads `secrets` becomes a TypeScript error.

```tsx
// More specific loaders can still read merged data when that is simpler.
export function ProjectHeader() {
  const { user, project } = useLoaderData('/dashboard/projects/:projectId/*')
  return <h1>{project.name} for {user.name}</h1>
}
```

When you need only one loader level, read only that level:

```tsx
export function ProjectSwitcher() {
  const { projects } = useLoaderData('/dashboard/*')
  return projects.map((project) => <a href={project.href}>{project.name}</a>)
}
```

```tsx
// Server routes can still read loaderData directly when rendering simple markup.
export const app = new Spiceflow()
  .loader('/account', async ({ request }) => {
    const user = await getUser(request)
    return { user }
  })
  .page('/account', async ({ loaderData }) => {
    return <h1>{loaderData.user.name}</h1>
  })
```

Loaders are a route-data boundary, not a replacement for every prop. Keep props for local state and component options. Use loaders for server data tied to the current route.

When multiple loaders match a route (e.g. `/*` and `/dashboard` both match `/dashboard`), their return values are merged into a single flat object. More specific loaders override less specific ones on key conflicts.

Loader data is type safe when the app is registered globally with `SpiceflowRegister`. `useLoaderData('/dashboard/projects/:id')` and `router.getLoaderData('/dashboard/projects/:id')` infer the merged object returned by every matching loader, so renaming a loader field or removing it becomes a TypeScript error in every component that reads it.

**Serialization**: loader return values are serialized through the React RSC flight format, not JSON. You can return JSX (including server components and client component elements with their props), `Promise`, async iterators, `Map`, `Set`, `Date`, `BigInt`, typed arrays, and any client component reference — all deserialized faithfully on the client. This means a loader can return a fully rendered `<Sidebar user={user} />` element and another component can receive it as `loaderData.sidebar` and drop it into the tree.

**Reading loader data in client components** uses the `useLoaderData` hook from `spiceflow/react`:

```tsx
// src/app/sidebar.tsx
'use client'

import { useLoaderData } from 'spiceflow/react'

export function Sidebar() {
  // Type-safe: path narrows the return type to the loaders matching '/dashboard'
  const { user, stats } = useLoaderData('/dashboard')
  return (
    <aside>
      {user.name} — {stats.totalViews} views
    </aside>
  )
}
```

Loader data updates automatically on client-side navigation — when the user navigates to a new route, the server re-runs the matching loaders and the new data arrives atomically with the new page content via the RSC flight stream.

**Reading loader data imperatively** uses the `router` import. This works in client code outside React components and during active server render. Call it inside component scope, event handlers, or helper functions tied to the current render flow instead of binding request-sensitive access at module scope:

```tsx
// src/app/editor-toolbar.tsx
'use client'

import { router, useLoaderData } from 'spiceflow/react'

async function readCurrentDocument() {
  return router.getLoaderData('/editor/:id')
}

export function EditorToolbar() {
  const { document } = useLoaderData('/editor/:id')

  async function refresh() {
    const next = await readCurrentDocument()
    console.log(next.document.title)
  }

  return <button onClick={refresh}>{document.title}</button>
}
```

## Streaming with `use()`

Loaders can return an unawaited `Promise` to start a slow fetch without blocking the page render. The promise travels through the RSC flight stream to the client, where a `'use client'` component calls `use(promise)` inside a `<Suspense>` boundary. The page HTML is sent immediately with the fallback; the real content streams in once the promise settles.

```tsx
// src/main.tsx
import { Suspense } from 'react'
import { HeavyStats } from './app/heavy-stats'

app
  .loader('/dashboard', async ({ request }) => {
    const user = await getUser(request)         // fast, awaited — blocks nothing
    const statsPromise = getExpensiveStats()    // slow, NOT awaited — streams later
    return { user, statsPromise }
  })
  .page('/dashboard', async ({ loaderData }) => {
    return (
      <div>
        <h1>Welcome {loaderData.user.name}</h1>
        <Suspense fallback={<p>Loading stats…</p>}>
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
  const stats = use(statsPromise)   // suspends here until the promise resolves
  return <div>{stats.totalViews} views</div>
}
```

The mechanics: the loader finishes immediately after `getUser()`, so the page server component renders and the RSC flight stream starts. The `statsPromise` is serialized into the stream as a pending promise reference. On the client, `use(statsPromise)` suspends `HeavyStats` and React shows the `<Suspense>` fallback. When the promise resolves on the server, the result is flushed into the same flight stream and React replaces the fallback with the real component — no extra HTTP round-trip.

This is faster than `await getExpensiveStats()` in the loader because the page skeleton reaches the browser immediately instead of waiting for the slow fetch to finish before any HTML is sent.

**Error handling**: if a loader throws a `redirect()` or `notFound()`, the entire request short-circuits — the page handler never runs. If a loader throws any other error, it renders through the nearest error boundary instead of showing a blank page.

## Parallel Data Fetching

Spiceflow already parallelizes at the framework level — all matched loaders run concurrently, then layouts and the page render concurrently after loaders finish. Within a single handler, use `Promise.all` for independent fetches instead of sequential `await`s:

```tsx
.page('/dashboard', async () => {
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getStats(),
  ])
  return <Dashboard user={user} posts={posts} analytics={analytics} />
})
```

## Forms & Server Actions

Forms use React 19's `<form action>` with server functions marked `"use server"`. They work before JavaScript loads (progressive enhancement).

Forms also support normal browser submissions when `action` is a string URL. This is standard HTML behavior in Spiceflow: the browser submits the form to the URL and performs a full document navigation.

```tsx
.page('/search', async () => {
  return (
    <form method="get" action="/results">
      <input name="q" />
      <button type="submit">Search</button>
    </form>
  )
})
```

Prefer a server or client action when the form should feel app-like. Passing a function to `action` lets React handle submission in a transition instead of doing a full browser reload. A server action can mutate data, then automatically re-render the current page with fresh server data or throw the handler context `redirect` to navigate. A client action can update local state, call APIs, or schedule a client navigation with `router.push()` / `router.replace()`.

```tsx
<form action={saveSettings}>
  <input name="name" />
  <Button type="submit">Save</Button>
</form>
```

**Successful server actions re-run matching loaders and reconcile the current page.** Do not call `router.refresh()` afterward. Use it only when data changes outside a server action.

Every submit button should show a loading state while its form action is in progress. Use `useFormStatus` from `react-dom` in your Button component to auto-detect pending forms — the button shows a spinner automatically when it's inside a `<form>` with a pending action:

Prefer file-level `"use server"` (a dedicated file like `src/actions.tsx`) over inline `"use server"` inside function bodies. Inline is fine for simple form actions defined directly in a server component page, or when the action needs the handler context `redirect`. If you find yourself passing actions as props to client components, import them from a `"use server"` file instead — it keeps action logic centralized and reusable.

```tsx
// src/app/button.tsx
'use client'
import { useFormStatus } from 'react-dom'

export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus()
  const loading = props.type === 'submit' && pending
  return (
    <button disabled={loading} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  )
}
```

Then use it in forms — no manual loading state needed. Use `parseFormData` to validate form fields with a Zod schema, and `schema.keyof().enum` for type-safe input `name` attributes (typos become compile errors):

```tsx
import { z } from 'zod'
import { parseFormData } from 'spiceflow'
import { Button } from './app/button'

const subscribeSchema = z.object({ email: z.string().email() })
const fields = subscribeSchema.keyof().enum

.page('/thank-you', async () => <ThankYou />)
.page('/subscribe', async ({ redirect }) => {
  async function subscribe(formData: FormData) {
    'use server'
    const { email } = parseFormData(subscribeSchema, formData)
    await addSubscriber(email)
    throw redirect('/thank-you')
  }
  return (
    <form action={subscribe}>
      <input name={fields.email} type="email" required />
      <Button type="submit">Subscribe</Button>
    </form>
  )
})
```

Use `useActionState` to display return values from the action. The action receives the previous state as its first argument and `FormData` as the second:

```tsx
// src/actions.tsx
'use server'

import { z } from 'zod'
import { parseFormData } from 'spiceflow'

export const subscribeSchema = z.object({ email: z.string().email() })

export async function subscribe(prev: string, formData: FormData) {
  const { email } = parseFormData(subscribeSchema, formData)
  await addSubscriber(email)
  return `Subscribed ${email}!`
}
```

```tsx
// src/app/newsletter.tsx
'use client'
import { useActionState } from 'react'
import { Button } from './button'
import { subscribeSchema } from '../actions'

const fields = subscribeSchema.keyof().enum

export function NewsletterForm({
  action,
}: {
  action: (prev: string, formData: FormData) => Promise<string>
}) {
  const [message, formAction] = useActionState(action, '')
  return (
    <form action={formAction}>
      <input name={fields.email} type="email" required />
      <Button type="submit">Subscribe</Button>
      {message && <p>{message}</p>}
    </form>
  )
}
```

```tsx
// In your server component page
.page('/newsletter', async () => {
  return <NewsletterForm action={subscribe} />
})
```

Server actions called directly from client event handlers also trigger the same automatic re-render:

```tsx
// src/actions.ts
'use server'

export async function deletePost(id: string) {
  await db.posts.delete(id)
}
```

```tsx
// src/app/delete-button.tsx
'use client'

import { deletePost } from '../actions'

export function DeleteButton({ id }: { id: string }) {
  return (
    <button
      onClick={async () => {
        await deletePost(id)
        // page re-renders automatically — no router.refresh() needed
      }}
    >
      Delete
    </button>
  )
}
```

### Action Buttons Without FormData

When a server action takes **no arguments** (or only typed arguments, not `FormData`), skip the `<form>` wrapper entirely. Use `useTransition` for pending state instead of `useFormStatus` (which requires a parent `<form>`):

```tsx
// src/app/checkout-button.tsx
'use client'

import { useTransition } from 'react'
import { startCheckout } from '../actions'

export function CheckoutButton() {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => startCheckout())}
    >
      {pending ? 'Redirecting...' : 'Subscribe'}
    </button>
  )
}
```

This is simpler than wrapping in a `<form action={startCheckout}>` with `useFormStatus()`, and avoids layout issues caused by the extra `<form>` element. Use `<form>` only when you actually need `FormData` (input fields) or progressive enhancement (works before JS loads).

<details>
<summary>Avoid deadlocks in client form actions</summary>

`router.refresh()` is fire-and-forget. Do not build awaitable navigation or refresh helpers and then use them inside a React client form action (`<form action={async () => { ... }}>`). React keeps that form action transition pending until the action returns, so awaiting the refresh or navigation commit from inside the action can deadlock the page.

Server actions already return a fresh RSC payload, so do not refresh after them.

</details>

## Server Actions

Use `"use server"` to define functions that run on the server but can be called from client components (e.g. form actions).

```tsx
// src/app/actions.tsx
'use server'

import { z } from 'zod'
import { getActionRequest, parseFormData } from 'spiceflow'

export const contactSchema = z.object({ name: z.string().min(1) })

export async function submitForm(formData: FormData) {
  const { signal } = getActionRequest()
  const { name } = parseFormData(contactSchema, formData)
  // signal is aborted when the client disconnects or cancels —
  // pass it to any downstream work so it cancels automatically
  await saveToDatabase(name, { signal })
}
```

On the client, `getActionAbortController()` returns the `AbortController` for the most recent in-flight call to a server action, or `undefined` if nothing is in-flight. Call `.abort()` to cancel the fetch.

**Server actions are public POST endpoints.** Any HTTP client can call them — not just your own browser. CSRF protection (Origin header check) prevents cross-site form submissions, but it does not authenticate the caller. If a server action mutates data, creates resources, or does anything user-specific, it must authenticate and authorize the request explicitly. The same rule applies to all API routes (`.get()`, `.post()`, etc.) and any middleware that modifies state. See the [Security guide](./security.md) for patterns.

Server actions include CSRF protection. The `Origin` header of POST requests is checked against the app's origin. This check is **disabled in development** (when `vite dev` is running) so tunnels and proxies work without issues. In production, the origin check works automatically on any hosting platform (Cloudflare Workers, Node.js, Vercel, etc.) because the browser's `Origin` header matches the server's URL.

<details>
<summary>allowedActionOrigins (rare, only for reverse proxies)</summary>

If you use a reverse proxy that rewrites the request URL before it reaches your app (so `request.url` differs from the browser's origin), server actions return `403 Forbidden: origin mismatch`. Use `allowedActionOrigins` to allow additional origins:

```tsx
const app = new Spiceflow({
  allowedActionOrigins: [
    'https://my-app.example.com',
    /\.my-proxy\.dev$/,
  ],
})
```

Each entry can be an exact origin string or a `RegExp` tested against the request's `Origin` header. You do **not** need this on Cloudflare Workers, Vercel, Fly.io, or any platform where the request URL already matches your domain.

</details>

## Streaming UI from Server Actions

Server actions can return JSX directly — including via async generators that stream React elements to the client incrementally. The RSC flight protocol serializes each yielded element as it arrives, and the client deserializes them into real React elements you can render.

This is useful for AI chat interfaces where the model generates structured output with tool calls. Instead of streaming raw text, you stream rendered UI:

```tsx
// src/app/actions.tsx
'use server'

import { getActionRequest } from 'spiceflow'
import { WeatherCard } from './weather-card'
import { StockChart } from './stock-chart'

export async function* chat(
  messages: { role: string; content: string }[],
): AsyncGenerator<React.ReactElement> {
  // Pass the request signal to downstream work so the LLM call
  // is cancelled when the client aborts (e.g. clicks "Stop")
  const { signal } = getActionRequest()
  const stream = await callLLM(messages, { signal })

  for await (const event of stream) {
    if (event.type === 'text') {
      yield <p>{event.content}</p>
    }
    if (event.type === 'tool_call' && event.name === 'get_weather') {
      const weather = await fetchWeather(event.args.city)
      yield <WeatherCard city={event.args.city} weather={weather} />
    }
    if (event.type === 'tool_call' && event.name === 'get_stock') {
      const data = await fetchStock(event.args.symbol)
      yield <StockChart symbol={event.args.symbol} data={data} />
    }
  }
}
```

```tsx
// src/app/chat.tsx
'use client'

import { z } from 'zod'
import { useState, useTransition, type ReactNode } from 'react'
import { getActionAbortController } from 'spiceflow/react'
import { parseFormData } from 'spiceflow'
import { chat } from './actions'

const chatSchema = z.object({ message: z.string().min(1) })
const fields = chatSchema.keyof().enum

export function Chat() {
  const [parts, setParts] = useState<ReactNode[]>([])
  const [isPending, startTransition] = useTransition()

  function send(formData: FormData) {
    const { message } = parseFormData(chatSchema, formData)
    setParts([])
    startTransition(async () => {
      const stream = await chat([{ role: 'user', content: message }])
      for await (const jsx of stream) {
        setParts((prev) => [...prev, jsx])
      }
    })
  }

  return (
    <div>
      <div>{parts.map((part, i) => <div key={i}>{part}</div>)}</div>
      <form action={send}>
        <input name={fields.message} placeholder="Ask something..." />
        <button type="submit" disabled={isPending}>Send</button>
        {isPending && (
          <button type="button" onClick={() => getActionAbortController(chat)?.abort()}>
            Stop
          </button>
        )}
      </form>
    </div>
  )
}
```

Each yielded element — whether a text paragraph, a weather card, or a stock chart — arrives as a fully rendered React component. The client doesn't need to know how to render tool calls; it just accumulates whatever JSX the server sends.

## Error Handling with ErrorBoundary

If a server action throws, the error is caught by the nearest `ErrorBoundary`. The error message is preserved (sanitized to strip secrets) and displayed to the user in both development and production builds.

Use `ErrorBoundary` from `spiceflow/react` to catch errors from form actions. It provides `ErrorBoundary.ErrorMessage` and `ErrorBoundary.ResetButton` sub-components that read the error and reset function from context — so they work as standalone elements anywhere in the `fallback` tree.

Actions should **throw errors** instead of returning error strings. Return **objects** for rich success data instead of scalars. Use `parseFormData` for validation — it throws a `ValidationError` when the schema fails, which `ErrorBoundary` catches automatically:

```tsx
// src/actions.ts
'use server'

import { z } from 'zod'
import { parseFormData } from 'spiceflow'

export const postSchema = z.object({ title: z.string().min(1, 'Title is required') })

export async function createPost(formData: FormData) {
  const { title } = parseFormData(postSchema, formData)
  const post = await db.posts.create({ title })
  return { id: post.id }
}
```

```tsx
// src/app/create-post.tsx
'use client'

import { ErrorBoundary } from 'spiceflow/react'
import { createPost, postSchema } from '../actions'

const fields = postSchema.keyof().enum

export function CreatePostForm() {
  return (
    <ErrorBoundary
      fallback={
        <div>
          <ErrorBoundary.ErrorMessage className="text-red-500" />
          <ErrorBoundary.ResetButton>Try again</ErrorBoundary.ResetButton>
        </div>
      }
    >
      <form action={createPost}>
        <input name={fields.title} required />
        <Button type="submit">Create</Button>
      </form>
    </ErrorBoundary>
  )
}
```

`ErrorBoundary.ErrorMessage` renders a `<div>` with `white-space: pre-wrap` and `ErrorBoundary.ResetButton` renders a `<button>`. Both accept all their respective HTML element props via `...props` spread, so you can pass `className`, `style`, `data-testid`, etc. Long error messages are **truncated** to 10 lines by default with a "Show more" toggle. Override with `<ErrorBoundary.ErrorMessage maxLines={5} />`.

**ErrorBoundary catches errors from three sources:**

| Source                                            | Where it runs | ErrorBoundary catches?                             |
| ------------------------------------------------- | ------------- | -------------------------------------------------- |
| Server action throws                              | Server        | Yes                                                |
| `parseFormData` in a server action (no try/catch) | Server        | Yes (`ValidationError` propagates)                 |
| `parseFormData` in a client form action           | Browser       | Yes (thrown inside React's form action transition) |

When the form action throws, the `ErrorBoundary` catches the error, hides the form, and renders the `fallback` with the error message and a reset button. Clicking "Try again" restores the form. The error boundary also auto-resets when the user navigates to a different page.

The recommended pattern is to run `parseFormData` **client-side** inside the form action, then call the server action with the validated data. This gives instant validation feedback without a server round-trip, and the `ValidationError` is still caught by `ErrorBoundary`:

```tsx
// src/app/create-contact.tsx
'use client'

import { parseFormData } from 'spiceflow'
import { ErrorBoundary } from 'spiceflow/react'
import { contactSchema } from '../schemas'
import { createContact } from '../actions'

const fields = contactSchema.keyof().enum

export function CreateContactForm() {
  return (
    <ErrorBoundary fallback={...}>
      <form action={async (formData: FormData) => {
        const data = parseFormData(contactSchema, formData) // client-side validation
        await createContact(data)                           // server action
      }}>
        <input name={fields.name} />
        <input name={fields.email} type="email" />
        <Button type="submit">Create</Button>
      </form>
    </ErrorBoundary>
  )
}
```

### Error Position: `above` and `below`

By default, `ErrorBoundary` **replaces** the form with the fallback when an error occurs. This causes layout shift and the user loses sight of their filled inputs. Use `above` or `below` to keep the form visible and interactive alongside the error message:

```tsx
<ErrorBoundary below fallback={
  <div className="text-red-500">
    <ErrorBoundary.ErrorMessage />
    <ErrorBoundary.ResetButton>Dismiss</ErrorBoundary.ResetButton>
  </div>
}>
  <form action={submitForm}>
    <input name={fields.name} />
    <Button type="submit">Save</Button>
  </form>
</ErrorBoundary>
```

`below` puts the error **below** the form. `above` puts it **above**. The form stays fully interactive; the user can fix their inputs and resubmit directly without clicking reset first. This works because form action errors don't invalidate the children's render tree; the error comes from the action, not from rendering.

For **direct action calls** (onClick handlers, not forms), use try/catch since the error doesn't propagate through React's rendering. Wrap in `startTransition` if you want pending state (`isPending`) and non-blocking behavior while the server data loads:

```tsx
import { useTransition } from 'react'

function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await deletePost({ id })
          } catch (e) {
            alert(e.message)
          }
        })
      }}
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
```
