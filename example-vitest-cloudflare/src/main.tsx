// Spiceflow app for testing inside the Cloudflare Workers runtime (workerd).
// Exercises pages, layouts, API routes, and cloudflare:workers APIs.
import { Spiceflow } from 'spiceflow'
import { Head } from 'spiceflow/react'
import { waitUntil, env } from 'cloudflare:workers'

const store = new Map<string, { id: string; name: string }>()

export const app = new Spiceflow({ name: 'cloudflare-vitest' })
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Cloudflare Vitest</Head.Title>
        </Head>
        <body>{children}</body>
      </html>
    )
  })
  .page('/', async function Home() {
    return (
      <div>
        <h1>Home</h1>
        <p>Running on Workers</p>
      </div>
    )
  })
  .page('/about', async function About() {
    return (
      <div>
        <h1>About</h1>
        <p>Cloudflare Workers + Spiceflow</p>
      </div>
    )
  })
  .page('/users/:id', async function UserPage({ params }) {
    return (
      <div>
        <h1>User {params.id}</h1>
        <p>Profile for {params.id}</p>
      </div>
    )
  })
  .get('/api/hello', () => ({ message: 'hello from workers' }))
  .get('/api/greet/:name', ({ params }) => ({
    greeting: `hello ${params.name}`,
  }))
  .post('/api/items', async ({ request }) => {
    const body = (await request.json()) as { name: string }
    const id = String(store.size + 1)
    const item = { id, name: body.name }
    store.set(id, item)
    return new Response(JSON.stringify(item), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })
  })
  .get('/api/items', () => ({ items: [...store.values()] }))
  .get('/api/items/:id', ({ params }) => {
    const item = store.get(params.id)
    if (!item) return new Response('not found', { status: 404 })
    return item
  })
  .get('/api/headers', ({ request }) => ({
    userAgent: request.headers.get('user-agent'),
    custom: request.headers.get('x-custom'),
  }))
  .get('/api/wait-until', () => {
    waitUntil(Promise.resolve('background'))
    return { queued: true }
  })
  .get('/api/env-check', () => {
    return { hasEnv: env != null }
  })
  .get('/api/redirect', () => {
    return Response.redirect('http://localhost/api/hello', 302)
  })
  .use(({ request }) => {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/admin')) {
      const auth = request.headers.get('authorization')
      if (!auth?.startsWith('Bearer ')) {
        return new Response('unauthorized', { status: 401 })
      }
    }
  })
  .get('/api/admin/secret', () => ({ secret: 42 }))

export function resetStore() {
  store.clear()
}

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
