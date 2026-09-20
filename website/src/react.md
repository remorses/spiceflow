---
$schema: https://holocron.so/frontmatter.json
title: Pages, layouts, Head tags, and navigation
sidebarTitle: React
description: "Build RSC apps with Vite: layouts, Head SEO tags, client components, code splitting, typed router, Link, redirects, cookies, and 404 pages."
icon: "lucide:atom"
prompt: |
  Write the React framework guide from @/spiceflow/src/vite.tsx, @/spiceflow/src/react/components.tsx,
  @/spiceflow/src/react/head.tsx, @/spiceflow/src/react/router.tsx, @/spiceflow/src/react/link.tsx,
  and @/spiceflow/src/react/progress.tsx. Cover Vite setup, Tailwind, app entry, layouts,
  Head SEO, client components, code splitting, router, Link, redirects, cookies, and 404 pages.
---

# Pages, layouts, Head tags, and navigation

Spiceflow includes a full-stack React framework built on React Server Components (RSC). It uses Vite with `@vitejs/plugin-rsc` under the hood. Server components run on the server by default, and you use `"use client"` to mark interactive components that need to run in the browser.

## Install

Install the dependencies and create a Vite config:

```bash
npm install spiceflow@rsc react react-dom
```

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    react(),
    spiceflow({
      entry: './src/main.tsx',
    }),
  ],
})
```

## Cloudflare RSC Setup

For Cloudflare Workers deployment with RSC, see [Cloudflare docs](./cloudflare.md). See [`example-cloudflare/`](https://github.com/remorses/spiceflow/tree/main/example-cloudflare) for a complete working example.

## Tailwind CSS

Install `@tailwindcss/vite` and `tailwindcss`, then add the Vite plugin:

```bash
npm install @tailwindcss/vite tailwindcss
```

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    spiceflow({ entry: './src/main.tsx' }),
    react(),
    tailwindcss(),
  ],
})
```

Create a `globals.css` file with Tailwind and any CSS variables you need:

```css
/* src/globals.css */
@import 'tailwindcss';

:root {
  --radius: 0.625rem;
  --background: var(--color-white);
  --foreground: var(--color-neutral-800);
}
```

Import it at the top of your app entry so styles apply globally:

```tsx
// src/main.tsx
import './globals.css'
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <body className="bg-white dark:bg-gray-900 text-black dark:text-white">
          {children}
        </body>
      </html>
    )
  })
  .page('/', async () => {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <h1 className="text-4xl font-bold">Welcome</h1>
      </div>
    )
  })
```

## shadcn/ui

Spiceflow works with [shadcn/ui](https://ui.shadcn.com) out of the box. Instead of the usual `tsconfig.json` paths hack (`@/*`), use `package.json` `exports` for component imports — it's a standard Node.js feature that works across runtimes and lets other workspace packages import your components too. See [shadcn docs](./shadcn.md) for the full setup guide and [`example-shadcn/`](https://github.com/remorses/spiceflow/tree/main/example-shadcn) for a working example.

## Directory Paths

> Only available when using the Vite plugin.

Server components sometimes need to read files from the filesystem at runtime — for example, reading images from `public/` to generate Open Graph images, or writing cached files to disk. Using `import.meta.dirname` breaks on platforms like Vercel where the function runs from a different directory than where you built.

`publicDir` and `distDir` resolve to the correct absolute paths in every environment:

```tsx
import { publicDir, distDir } from 'spiceflow'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function generateOgImage(slug: string) {
  const template = await readFile(path.join(publicDir, 'og-template.png'))
  // ... generate image
  await writeFile(path.join(distDir, 'cache', `${slug}.png`), result)
}
```

|                | `publicDir`                                            | `distDir`  |
| -------------- | ------------------------------------------------------ | ---------- |
| **Dev**        | `<cwd>/public`                                         | `<cwd>`    |
| **Production** | `<outDir>/client` (where Vite copies public/ contents) | `<outDir>` |

## App Entry

The entry file defines your routes using `.page()` for pages and `.layout()` for layouts. This file runs in the RSC environment on the server. Keep the route chain focused on handlers and move type-safe link building into components or other modules.

```tsx
// src/main.tsx
import { Spiceflow, serveStatic } from 'spiceflow'
import { router, Head, Link } from 'spiceflow/react'
import { z } from 'zod'
import { Counter } from './app/counter'
import { Nav } from './app/nav'

export const app = new Spiceflow()
  .use(serveStatic({ root: './public' }))
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <Head>
          <Head.Meta charSet="UTF-8" />
        </Head>
        <body>
          <Nav />
          {children}
        </body>
      </html>
    )
  })
  .page('/', async () => {
    const data = await fetchSomeData()
    return (
      <div>
        <h1>Welcome</h1>
        <p>Server-rendered data: {data.message}</p>
        <Counter />
        <Link href={router.href('/users/:id', { id: '42' })}>View User 42</Link>
        <Link href={router.href('/search', { q: 'spiceflow' })}>Search</Link>
      </div>
    )
  })
  .page('/about', async () => {
    return (
      <div>
        <h1>About</h1>
        <Link href={router.href('/')}>Back to Home</Link>
      </div>
    )
  })
  .page('/users/:id', async ({ params }) => {
    return (
      <div>
        <h1>User {params.id}</h1>
      </div>
    )
  })
  // Object-style .page() with query schema — enables type-safe query params
  .page({
    path: '/search',
    query: z.object({ q: z.string(), page: z.number().optional() }),
    handler: async ({ query }) => {
      const results = await search(query.q, query.page)
      return (
        <div>
          <h1>Results for "{query.q}"</h1>
          {results.map((r) => (
            <p key={r.id}>{r.title}</p>
          ))}
        </div>
      )
    },
  })
  .listen(3000)

// Register the app type for type-safe routing everywhere
declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
```

`router.href()` gives you **type-safe links** in component modules and other files outside the route chain. TypeScript validates that the path exists, params are correct, and query values match the schema. Invalid paths or missing params are caught at compile time.

Add the `declare module` block at the bottom of your app entry file. This registers your app's routes globally — then `import { router } from 'spiceflow/react'` anywhere in the project gives you a fully typed router without needing to pass generics or import the app type.

<details>
<summary>When registered APIs cause circular types</summary>

Circular TypeScript errors (TS7022) happen when any API that reads from `SpiceflowRegister` (i.e. `typeof app`) appears in a handler's **return value**. The return type feeds back into `typeof app`, creating a cycle. This affects `router.href()`, `router.getLoaderData()`, `createSpiceflowFetch()`, and any future API typed against the registered app.

**Safe** (no circular):
- Any registered API in **JSX children or attributes** (`.page()`, `.layout()` returning JSX)
- Any registered API in **JSX event handlers** (`onClick`, etc.)
- `throw` expressions: `throw redirect(router.href(...))` in any handler
- Any registered API in **client components, server components, and separate files**

**Circular** (causes TS7022):
- Any registered API in a `.loader()` **return value** (e.g. `return { url: router.href(...) }`)
- Any registered API in a `.get()` or `.post()` **return value** (e.g. `return { result: await fetchClient(...) }`)
- `return redirect(router.href(...))` inside `.page()` on paths **with loaders**

The rule: circular happens when a `RegisteredApp`-typed expression reaches a **return value** that TypeScript needs to infer `typeof app`. JSX, `throw`, and event handler callbacks don't feed return types. See `spiceflow/src/type-repros/registered-app-circular.test.ts` for the exact boundaries.

</details>

## Layouts

Define a root `.layout('/*', ...)` with the document shell (`<html>`, `<head>`, `<body>`). More specific layouts should only return shared parent UI like sidebars, nav, or section chrome — not another `<html>` shell. Wildcard layouts also match their base path, so `/app/*` wraps both `/app` and `/app/settings`.

```tsx
export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <body>{children}</body>
      </html>
    )
  })
  .layout('/app/*', async ({ children }) => {
    return <section className="app-shell">{children}</section>
  })
  .layout('/docs/*', async ({ children }) => {
    return <section className="docs-shell">{children}</section>
  })
  .page('/app', async () => {
    return <h1>App home</h1>
  })
  .page('/app/settings', async () => {
    return <h1>App settings</h1>
  })
  .page('/docs', async () => {
    return <h1>Docs home</h1>
  })
  .page('/docs/getting-started', async () => {
    return <h1>Getting started</h1>
  })
```

<details>
<summary>Nesting rules</summary>

Only the root layout should render the full HTML document shell. If a nested layout also renders `<html>`, the shell repeats and you end up nesting full HTML documents inside each other. Only add scoped layouts when many pages share the same parent components.

</details>

## SEO

Use `<Head>`, `<Head.Title>`, and `<Head.Meta>` from `spiceflow/react` for type-safe, automatically deduplicated head tags that are correctly injected during SSR. Page tags override layout tags with the same key.

Every page should have a `<Head.Title>` and a `<Head.Meta name="description">`. These are the two most important tags for SEO — they control what appears in search engine results.

> [!IMPORTANT]
> **`<Head>` only works in a server component.** It does not render anything; it records its children during the RSC render, and spiceflow reads them back to build the document head. A `'use client'` module never runs in that render, so a `<Head>` inside one contributes nothing. Importing `Head` from a `'use client'` module **fails the build**, and rendering one throws, rather than dropping your `<title>` silently.

Put the `<Head>` in the `.page()` or `.layout()` handler, then render the client component next to it:

```tsx
// app.tsx — server
.page('/', async () => {
  return (
    <>
      <Head>
        <Head.Title>Make ChatGPT undetectable</Head.Title>
        <Head.Meta name="description" content="Rewrite AI text so it reads like a human wrote it." />
      </Head>
      <InteractiveEditor />
    </>
  )
})
```

```tsx
// interactive-editor.tsx — client, no <Head> here
'use client'

export function InteractiveEditor() {
  const [text, setText] = useState('')
  return <textarea value={text} onChange={(e) => setText(e.target.value)} />
}
```

To change the title from the browser after the page has loaded, set `document.title` in an effect. `<Head>` is for the server-rendered document.

<details>
<summary>Title and description guidelines</summary>

**Title:** Keep titles under 60 characters so they don't get truncated in search results. Put the most important keywords first. Use a consistent format like `Page Name | Site Name`.

**Description:** Keep descriptions between 120–160 characters. Summarize the page content clearly — this is the snippet shown below the title in search results. Each page should have a unique description that accurately reflects its content.

Always use `<Head>`, `<Head.Title>`, and `<Head.Meta>` from `spiceflow/react` instead of raw `<head>`, `<title>`, and `<meta>` tags. The `Head` components are type-safe, automatically deduplicated (page tags override layout tags with the same key), and correctly injected into the document head during SSR.

</details>

```tsx
.page('/', async () => {
  return (
    <div>
      <Head>
        <Head.Title>Spiceflow – Build Type-Safe APIs</Head.Title>
        <Head.Meta name="description" content="A fast, type-safe API and RSC framework for TypeScript." />
      </Head>
      <h1>Welcome</h1>
    </div>
  )
})
```

If you want a consistent title prefix or suffix across all pages, create a wrapper component:

```tsx
function PageHead({ title, description }: { title: string; description: string }) {
  return (
    <Head>
      <Head.Title>{title} | My App</Head.Title>
      <Head.Meta name="description" content={description} />
    </Head>
  )
}

// Then use it in any page
.page('/about', async () => {
  return (
    <div>
      <PageHead title="About" description="Learn more about our team and mission." />
      <h1>About</h1>
    </div>
  )
})
```

## Query Params

Define a `query` schema on routes and pages that accept query parameters — even when all params are optional. Use the object notation for `.page()` and `.route()` so the query requirements are documented in the route definition and accessible with full type safety in the handler:

```tsx
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

export const app = new Spiceflow()
  // Object notation gives you typed query access
  .page({
    path: '/products',
    query: z.object({
      category: z.string().optional(),
      sort: z.enum(['price', 'name', 'date']).optional(),
      page: z.coerce.number().optional(),
    }),
    handler: async ({ query }) => {
      // query.category is string | undefined — fully typed
      // query.sort is 'price' | 'name' | 'date' | undefined
      // query.page is number | undefined
      const products = await getProducts(query)
      return (
        <div>
          <h1>Products</h1>
          {products.map((p) => <p key={p.id}>{p.name}</p>)}
        </div>
      )
    },
  })
```

<details>
<summary>Why always define a query schema</summary>

Without a query schema, `query` is `Record<string, string | undefined>` — you lose autocomplete, typos go unnoticed, and there's no documentation of what the page accepts.

Always define a `query` schema on routes and pages that accept query parameters. Use `href()` to build links to these pages — when a route has a query schema, `href` enforces the correct query keys at compile time. If you rename or remove a query param from the schema, every `href()` call that references it becomes a type error — no stale links.

</details>

**Use `href()` to build links to these pages.** When a route has a query schema, `href` enforces the correct query keys at compile time. If you rename or remove a query param from the schema, every `href()` call that references it becomes a type error — no stale links:

```tsx
'use client'
import { router, Link } from 'spiceflow/react'

export function ProductFilters() {
  return (
    <nav>
      {/* TypeScript validates these query keys against the schema */}
      <Link href={router.href('/products', { category: 'shoes', sort: 'price' })}>
        Shoes by Price
      </Link>
      <Link href={router.href('/products', { sort: 'date', page: 2 })}>
        Page 2, newest first
      </Link>

      {/* @ts-expect-error — 'color' is not in the query schema */}
      <Link href={router.href('/products', { color: 'red' })}>Red</Link>
    </nav>
  )
}
```

The same pattern works for API routes with `.route()`. Query params are automatically coerced from strings to match the schema type — you don't need `z.coerce.number()`, just use `z.number()` directly:

```tsx
export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/api/search',
    query: z.object({
      q: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    handler({ query }) {
      // query.q is string, query.limit is number | undefined
      return searchDatabase(query.q, query.limit, query.offset)
    },
  })
```

**Array query params** use repeated keys in the URL: `?tag=a&tag=b` (not comma-separated). Single values are automatically wrapped into arrays when the schema expects `z.array()`:

```tsx
// URL: /api/posts?tag=react or /api/posts?tag=react&tag=typescript
export const app = new Spiceflow().route({
  method: 'GET',
  path: '/api/posts',
  query: z.object({
    tag: z.array(z.string()),
    limit: z.number().optional(),
  }),
  handler({ query }) {
    // query.tag is always string[], even with a single ?tag=react
    // query.limit is number | undefined, coerced from the string automatically
    return getPostsByTags(query.tag)
  },
})
```

## Client Components

Mark interactive components with `"use client"` at the top of the file. These are hydrated in the browser and can use hooks like `useState`.

```tsx
// src/app/counter.tsx
'use client'

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  )
}
```

## Don't export plain objects from `'use client'` files

In RSC, the entire module marked with `'use client'` becomes an opaque client reference on the server. You can render client component references as JSX, but you **cannot spread or iterate** them. If a server component imports a plain object (like a component map or config) from a `'use client'` file and tries to spread it, the spread produces nothing.

```tsx
// BAD: server component can't spread this
// my-components.tsx
'use client'
import { useState } from 'react'
function Counter() { /* ... uses useState */ }
function P({ children }) { return <p className="prose">{children}</p> }
export const components = { p: P, counter: Counter }

// GOOD: keep the map in a server-compatible file
// counter.tsx
'use client'
export function Counter() { /* ... uses useState */ }

// my-components.tsx (no 'use client')
import { Counter } from './counter'
function P({ children }) { return <p className="prose">{children}</p> }
export const components = { p: P, counter: Counter }
```

Only components that use browser-only APIs (hooks, DOM refs) need `'use client'`. Pure JSX, config objects, and component maps must stay in server-compatible modules. Import individual client components into the server module, not the other way around.

## Code Splitting

Code splitting of client components is **automatic** — you don't need `React.lazy()` or dynamic `import()`. Each `"use client"` file becomes a separate chunk, and the browser only loads the chunks needed for the current page.

<details>
<summary>How it works</summary>

When the RSC flight stream is sent to the browser, it contains references to client component chunks rather than the actual code. The browser resolves and loads only the chunks referenced on the current page. If route `/about` uses `<Map />` and route `/dashboard` uses `<Chart />`, visiting `/about` will never download the Chart component's JavaScript.

</details>

<details>
<summary>Barrel file pitfall</summary>

Avoid barrel files with `"use client"`. If you have a single file with `"use client"` that re-exports many components, all of them end up in one chunk — defeating code splitting. Instead, put `"use client"` in each individual component file:

```tsx
// BAD — one big chunk for everything
// src/components/index.tsx
'use client'
export { Chart } from './chart'
export { Map } from './map'
export { Table } from './table'
```

```tsx
// GOOD — each component is its own chunk
// src/components/chart.tsx
'use client'
export function Chart() {
  /* ... */
}

// src/components/map.tsx
;('use client')
export function Map() {
  /* ... */
}

// Re-export barrel has no directive, just passes through
// src/components/index.tsx
export { Chart } from './chart'
export { Map } from './map'
```

</details>

## View Transitions

Client navigations already run inside `startTransition`, so wrapping page content in React 19.3 `<ViewTransition>` animates route changes. Spiceflow tags each navigation with `addTransitionType('navigation-forward')` or `addTransitionType('navigation-back')` so you can pick different enter/exit CSS.

```tsx
import { ViewTransition } from 'react'

.layout('/*', async ({ children }) => {
  return (
    <html>
      <body>
        <ViewTransition
          enter={{
            'navigation-forward': 'slide-from-right',
            'navigation-back': 'slide-from-left',
          }}
          exit={{
            'navigation-forward': 'slide-to-left',
            'navigation-back': 'slide-to-right',
          }}
        >
          {children}
        </ViewTransition>
      </body>
    </html>
  )
})
```

`PUSH`, `REPLACE`, and history forward use `navigation-forward`. History back uses `navigation-back`. Server actions that re-render the current page do not add a type, so they do not steal a route animation. Wrap only the subtree you want to animate. React skips the animation in browsers without the View Transition API.

Define the class names in CSS with `::view-transition-old(...)` and `::view-transition-new(...)`. See the [React `<ViewTransition>` docs](https://react.dev/reference/react/ViewTransition).

## Resource Preloading

React 19 exports `preload`, `preinit`, `prefetchDNS`, and `preconnect` from `react-dom`. Call them in your component render body and they emit `<link>` tags into SSR HTML so the browser starts fetching before any JS runs. Works in both server and client components; duplicates are auto-deduplicated.

```tsx
import { preload, preinit, prefetchDNS, preconnect } from 'react-dom'

function App() {
  preload('/assets/hero.mp4', { as: 'video' })
  preload('/fonts/Inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  preinit('/styles/dashboard.css', { as: 'style' })   // downloads AND inserts
  prefetchDNS('https://api.example.com')
  preconnect('https://cdn.example.com', { crossOrigin: 'anonymous' })

  return <div>{/* ... */}</div>
}
```

| Function      | Effect               | Use for               |
| ------------- | -------------------- | --------------------- |
| `preload`     | Download and cache   | Videos, images, fonts |
| `preinit`     | Download and execute | Stylesheets, scripts  |
| `prefetchDNS` | DNS lookup           | API domains           |
| `preconnect`  | DNS + TCP + TLS      | CDNs, auth providers  |

## `use client` trap in optimized dependencies

If a `node_modules` dependency mixes server and client code in one entry, Vite can flatten the `'use client'` boundary into a server chunk — crashing at startup with errors like `useState is undefined`. See [docs/use-client-trap.md](https://github.com/remorses/spiceflow/blob/main/docs/use-client-trap.md) for symptoms, diagnosis, and fixes.

## Progress Bar

Render `<ProgressBar />` once in the root layout. For manual client-side async work, wrap the call in `ProgressBar.start()` / `ProgressBar.end()`:

```tsx
// src/main.tsx
import { Spiceflow } from 'spiceflow'
import { ProgressBar } from 'spiceflow/react'
import { SaveButton } from './app/save-button'

export const app = new Spiceflow().layout('/*', async ({ children }) => {
  return (
    <html>
      <body>
        <ProgressBar />
        {children}
        <SaveButton />
      </body>
    </html>
  )
})

// src/app/save-button.tsx
'use client'

import { ProgressBar } from 'spiceflow/react'

export function SaveButton() {
  return (
    <button
      onClick={async () => {
        ProgressBar.start()
        try {
          await fetch('/api/save', { method: 'POST' })
        } finally {
          ProgressBar.end()
        }
      }}
    >
      Save
    </button>
  )
}
```

Manual calls share the same state as router navigation, so if a navigation and a client fetch overlap, the bar stays visible until both have finished.

<details>
<summary>React export shape</summary>

Do not mix React component exports with non-React exports like `const`, `Context`, or plain helper functions in the same public module. That can break HMR / Fast Refresh because the module stops behaving like a pure component module.

If a component needs imperative helpers, attach them as static properties on the component instead of exporting separate helpers. For example, prefer `ProgressBar.start()` / `ProgressBar.end()` over standalone `startProgressBar()` or `endProgressBar()` exports.

</details>

## Redirecting After Actions

When a server action needs to navigate to a different page (e.g. after creating a resource), use `redirect` inside the action instead of `router.push()` on the client. Since every server action triggers a page re-render, calling `router.push()` after the action would briefly flash the re-rendered current page before navigating away.

In standalone `"use server"` action files, always wrap the redirect target with `router.href()` for type safety — TypeScript will catch invalid paths and missing params at compile time:

```tsx
// src/actions.ts
'use server'

import { redirect } from 'spiceflow'
import { router } from 'spiceflow/react'
import { parseFormData } from 'spiceflow'
import type { z } from 'zod'
import { projectSchema } from './schemas.ts'

export async function createProject(formData: FormData) {
  const { name } = parseFormData(projectSchema, formData)
  const project = await db.projects.create({ name })
  // router.href validates the path and params against the route table at compile time
  throw redirect(router.href('/orgs/:orgId/projects/:projectId', {
    orgId: project.orgId,
    projectId: project.id,
  }))
}
```

For inline actions defined directly inside a `.page()` or `.layout()` handler (in the same file as `export const app`), prefer the handler context `redirect` with a plain string or the `params` option to sidestep circular type issues (see [when router.href() causes circular types](#app-entry)):

```tsx
import { Spiceflow, parseFormData } from 'spiceflow'
import { z } from 'zod'

const projectSchema = z.object({ name: z.string().min(1) })
const fields = projectSchema.keyof().enum

export const app = new Spiceflow()
  .page('/orgs/:orgId/projects/:projectId', async ({ params }) => {
    const project = await db.projects.find(params.projectId)
    return <ProjectPage project={project} />
  })
  .page('/orgs/:orgId/projects/new', async ({ params, redirect }) => {
    async function createProject(formData: FormData) {
      'use server'
      const { name } = parseFormData(projectSchema, formData)
      const project = await db.projects.create({ name, orgId: params.orgId })
      // Use plain string redirect inside app-entry inline actions to avoid circular types
      throw redirect('/orgs/:orgId/projects/:projectId', {
        params: { orgId: params.orgId, projectId: project.id },
      })
    }

    return (
      <form action={createProject}>
        <input name={fields.name} required />
        <button type="submit">Create</button>
      </form>
    )
  })
```

`router.push()`, `router.replace()`, `router.back()`, `router.forward()`, and `router.go()` are still the right choice for pure client-side navigation that doesn't involve a server action (e.g. tab switches, select dropdowns, back buttons). These APIs are all fire-and-forget — do not build awaitable wrappers around navigation commits and then call them inside a React client form action.

### Setting Cookies from Server Actions

Server actions **can set cookies**: pass `headers` as the second argument to `redirect()`. The browser stores the `set-cookie` header from the action response, the router follows the redirect client-side, and loaders re-run with the new cookie — no full page reload needed. Never create a GET route + `window.location.href` full-page navigation just to set a cookie.

```tsx
// src/actions.ts
'use server'

import { redirect } from 'spiceflow'
import { router } from 'spiceflow/react'

export async function switchOrg({ orgId }: { orgId: string }) {
  await assertMembership(orgId)
  throw redirect(router.href('/dashboard'), {
    headers: {
      'set-cookie': `active_org=${orgId}; Path=/; HttpOnly; SameSite=Lax`,
    },
  })
}
```

## Router

Import `router` from `spiceflow/react` for type-safe navigation, URL building, and imperative loader data access. It works in **client components, server components, non-route modules, page handlers, and layout handlers**. Avoid any registered API (`router.href()`, `createSpiceflowFetch()`, etc.) in **return values** of `.loader()`, `.get()`, or `.post()` handlers in the app entry file; JSX, `throw`, and event handlers are always safe. See [when registered APIs cause circular types](#app-entry) for details. `useLoaderData` and `useRouterState` are exported separately from `spiceflow/react`.

`router` is a **stable singleton** — the same object reference every time. It's safe to use in component bodies, pass to hook dependency arrays, or reference at module scope. The reference never changes between renders, so it won't trigger unnecessary re-renders or effect re-runs.

Use `href()` for links so route and query changes are caught by TypeScript.

```tsx
// src/app/nav.tsx
'use client'

import { router, Link } from 'spiceflow/react'

export function Nav() {

  return (
    <nav>
      <Link href={router.href('/')}>Home</Link>
      <Link href={router.href('/about')}>About</Link>
      <Link href={router.href('/users/:id', { id: '1' })}>User 1</Link>
      <Link href={router.href('/search', { q: 'docs', page: 1 })}>Search Docs</Link>
    </nav>
  )
}
```

<details>
<summary>Using router in mounted sub-apps</summary>

`router` sees all routes registered on the root app, regardless of where you import it. Component modules used by mounted sub-apps still see the whole route table — not just the sub-app's own routes:

```tsx
// src/features/billing/billing-page.tsx
import { router, Link } from 'spiceflow/react'

export function BillingPage() {
  // router is typed against the WHOLE app, not just billingApp
  return (
    <div>
      <h1>Billing</h1>
      {/* Link to a route defined in a different sub-app */}
      <Link href={router.href('/users/:id', { id: '42' })}>Back to profile</Link>
    </div>
  )
}
```

No need to thread `app` through props or imports — every import is still fully type-checked against the root app's route table.

</details>

Wildcard routes like `/orgs/:orgId/*` accept **template literals** with interpolated values. TypeScript template literal types ensure only strings matching a registered route pattern are accepted:

```tsx
// Pattern form — pass params as an object
router.href('/orgs/:orgId/*', { orgId: 'acme', '*': 'projects' })
// → "/orgs/acme/projects"

// Template literal form — params already in the string
const orgId = 'acme'
router.href(`/orgs/${orgId}/projects`)
// → "/orgs/acme/projects"

// Works with any depth under the wildcard
const projectId = 'p1'
router.href(`/orgs/${orgId}/projects/${projectId}/settings`)
// → "/orgs/acme/projects/p1/settings"
```

The pattern form gives the strongest type checking — param names, query keys, and route existence are all validated. The template literal form is checked against registered route prefixes, but once values are interpolated TypeScript no longer knows the original param names. Invalid prefixes like `/settings/foo` still error at compile time either way.

`router` works on the server too — use it in server components to build type-safe links without needing the `app` closure:

```tsx
// src/app/org-breadcrumb.tsx (server component — no "use client")
import { router, Link } from 'spiceflow/react'

export async function OrgBreadcrumb({ orgId }: { orgId: string }) {
  return (
    <nav>
      <Link href={router.href('/')}>Home</Link>
      <span> / </span>
      <Link href={router.href(`/orgs/${orgId}/projects`)}>Projects</Link>
    </nav>
  )
}
```

<details>
<summary>Always use href() for links</summary>

Every `Link` href and every programmatic navigation path should go through `href()`. Raw string paths like `<Link href="/users/42">` bypass type checking — if the route is renamed from `/users/:id` to `/profiles/:id`, the raw string silently becomes a 404 while `href('/users/:id', { id: '42' })` immediately fails `tsc`. When a route path changes or gets removed, `tsc` catches every stale `href()` call at compile time.

This applies to client and server component modules. The `router` import is the same typed singleton everywhere outside loaders and API route handlers.

</details>

## Navigation & State

The `router` object handles type-safe client-side navigation. `router.push`, `router.replace`, and `router.href` accept typed paths with autocomplete — params and query values are validated at compile time:

```tsx
// src/app/search-filters.tsx
'use client'

import { router, useRouterState } from 'spiceflow/react'

export function SearchFilters() {
  const { pathname, searchParams } = useRouterState()

  const query = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const sort = searchParams.get('sort') ?? 'relevance'

  function setPage(n: number) {
    router.push({
      search: '?' + new URLSearchParams({ q: query, page: String(n), sort }),
    })
  }

  function setSort(newSort: string) {
    router.push({
      search: '?' + new URLSearchParams({ q: query, page: '1', sort: newSort }),
    })
  }

  return (
    <div>
      <p>
        Showing results for "{query}" — page {page}, sorted by {sort}
      </p>
      <button onClick={() => setSort('date')}>Sort by Date</button>
      <button onClick={() => setPage(page + 1)}>Next Page</button>
    </div>
  )
}
```

`useRouterState()` subscribes to navigation changes and re-renders the component when the URL changes. It returns the current `pathname`, `search`, `hash`, and a parsed `searchParams` (a read-only `URLSearchParams`).

You can also navigate to a different pathname with search params, or use `router.replace` to update without adding a history entry:

```tsx
import { router } from 'spiceflow/react'

function Example() {

  // Navigate to a new path with search params
  router.push({
    pathname: '/search',
    search: '?' + new URLSearchParams({ q: 'spiceflow' }),
  })

  // Replace current history entry (back button skips this)
  router.replace({
    search: '?' + new URLSearchParams({ tab: 'settings' }),
  })

  // Or just use a plain string
  router.push('/search?q=spiceflow&page=1')
}
```

<details>
<summary>Navigation methods are fire-and-forget</summary>

`router.push()`, `router.replace()`, `router.back()`, `router.forward()`, and `router.go()` schedule navigation and return immediately. Do not wrap them in helpers that wait for the next navigation commit and then call those helpers from a React client form action — React keeps the form action transition pending until the action returns, so awaiting that same commit can deadlock the page.

</details>

## Redirects and Not Found

**Always `throw redirect(...)`, never `return redirect(...)`.** Both work at runtime, but `throw` is safer for TypeScript: it prevents the redirect from contributing to the handler's inferred return type, which avoids circular TS7022 errors when using `SpiceflowRegister`. It also short-circuits the handler immediately, making control flow explicit.

**Every app must render a 404 page** that explains the page was not found. The built-in `DefaultNotFoundPage` is unstyled. When no page matches, layout `children` is `null`. Handle that in the **root** `/*` layout: `LayoutContent` renders the first layout, so if that layout returns `{children}` and children is null, the page is blank white.

<details>
<summary>Do not add a catch-all <code>.page('/*')</code> next to API routes</summary>

A wildcard **page** matches every GET, including mounted API routes (`/api/v2/*`) and aliases like `/signup`. Those requests then 404 as HTML instead of reaching the real handler.

Put the not-found UI in the root layout instead. Set `response.status = 404` when `children == null`.

</details>

Use the handler context `redirect` and `response.status` inside `.page()` and `.layout()` handlers to control navigation and HTTP status codes:

```tsx
import { Spiceflow } from 'spiceflow'

function NotFound({ path }: { path?: string }) {
  return (
    <main>
      <h1>Page not found</h1>
      <p>{path ? `The page ${path} was not found.` : 'This page was not found.'}</p>
    </main>
  )
}

export const app = new Spiceflow()
  .page('/login', async () => <Login />)
  .layout('/*', async ({ children, request, response }) => {
    if (children == null) response.status = 404
    return (
      <AppLayout>
        {children ?? <NotFound path={request.parsedUrl.pathname} />}
      </AppLayout>
    )
  })
  .page('/dashboard', async ({ request, redirect }) => {
    const user = await getUser(request)
    if (!user) {
      throw redirect('/login')
    }
    return <Dashboard user={user} />
  })
  .page('/posts/:id', async ({ params, response }) => {
    const post = await getPost(params.id)
    if (!post) {
      response.status = 404
      return <NotFound path={`/posts/${params.id}`} />
    }
    return <Post post={post} />
  })
  // Layouts can throw redirect — useful for auth guards that protect
  // an entire section of your app
  .layout('/admin/*', async ({ children, request, redirect }) => {
    const user = await getUser(request)
    if (!user?.isAdmin) {
      throw redirect('/login')
    }
    return <AdminLayout>{children}</AdminLayout>
  })

export type App = typeof app
```

Context `redirect()` accepts a plain string URL plus an optional second argument for custom status codes and headers. It is intentionally not type-safe against the route table, so it does not pull `typeof app` back into handler context inference:

```tsx
// 301 permanent redirect
.page('/old-login', async ({ redirect }) => {
  throw redirect('/login', { status: 301 })
})

// Redirect with custom headers
.page('/logout', async ({ redirect }) => {
  throw redirect('/login', {
    headers: { 'set-cookie': 'session=; Max-Age=0' },
  })
})
```

<details>
<summary>Response status, headers, and HTTP behavior</summary>

**`response.status` and `response.headers`** — every page and layout handler receives a mutable `response` object on the context. Set `response.status` to control the HTTP status code (defaults to 200). Set `response.headers` to add custom headers like `cache-control` or `set-cookie`.

**Correct HTTP status codes.** Unlike Next.js, where redirects always return a 200 status with client-side handling, Spiceflow returns the actual HTTP status code in the response — `307` for redirects (with a `Location` header) and whatever you set via `response.status` for pages. This works even when the throw happens after an `await`, because the SSR layer intercepts the error from the RSC stream before flushing the HTML response. Search engines see correct status codes, and `fetch()` calls with `redirect: "manual"` get the real `307` response.

**Client-side navigation.** When a user clicks a `<Link>` that navigates to a page throwing context `redirect()`, the router performs the redirect client-side without a full page reload.

</details>

<details>
<summary>Authentication: pages vs API routes</summary>

Pages and layouts should always `throw redirect('/login')` from handler context when the user is not authenticated. API routes (`.get()`, `.post()`, etc.) should return a JSON error with a 401 status instead. This keeps the experience clean: users visiting a protected page get redirected to login instead of seeing a raw JSON blob, while API consumers get a proper typed error response they can handle programmatically.

```tsx
// Page — redirect to login
.page('/dashboard', async ({ request, redirect }) => {
  const user = await getUser(request)
  if (!user) throw redirect('/login')
  return <Dashboard user={user} />
})

// Layout — redirect to login (protects all nested pages)
.layout('/app/*', async ({ children, request, redirect }) => {
  const user = await getUser(request)
  if (!user) throw redirect('/login')
  return <AppLayout>{children}</AppLayout>
})

// API route — return JSON 401
.get('/api/profile', async ({ request }) => {
  const user = await getUser(request)
  if (!user) return json({ message: 'Not authenticated' }, { status: 401 })
  return json({ user })
})

// Middleware — protect all routes in a sub-app with JSON 401
const api = new Spiceflow()
  .use(async ({ request }) => {
    const user = await getUser(request)
    if (!user) return json({ message: 'Not authenticated' }, { status: 401 })
  })
  .get('/profile', async ({ request }) => {
    const user = await getUser(request)
    return json({ user })
  })

app.use(api, { prefix: '/api' })
```

</details>
