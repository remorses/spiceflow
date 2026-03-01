// example Spiceflow app with React SSR pages and JSON API routes side by side

import { Spiceflow } from 'spiceflow/src/spiceflow'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ marginRight: 12, color: '#0070f3' }}>
      {children}
    </a>
  )
}

const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Spiceflow + React SSR</title>
        </head>
        <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 640, margin: '0 auto' }}>
          <nav style={{ marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
            <NavLink href="/">Home</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/users/42">User 42</NavLink>
          </nav>
          {children}
        </body>
      </html>
    )
  })
  .page('/', async () => {
    return (
      <div>
        <h1>Home</h1>
        <p>This page is server-rendered with React.</p>
        <p>The time is {new Date().toISOString()}</p>
      </div>
    )
  })
  .page('/about', async () => {
    return (
      <div>
        <h1>About</h1>
        <p>Spiceflow with plain React SSR — no RSC, no custom Vite plugin.</p>
      </div>
    )
  })
  .page('/users/:id', async ({ params }) => {
    return (
      <div>
        <h1>User {params.id}</h1>
        <p>This is a dynamic page. The :id param is {params.id}.</p>
      </div>
    )
  })
  .get('/api/hello', () => {
    return { message: 'Hello from JSON API!' }
  })
  .post('/api/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })

app.listen(3000)
