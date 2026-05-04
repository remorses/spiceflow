// Spiceflow app for vitest integration testing.
// Tests call app.handle() directly to verify page and API route responses.
import { Spiceflow } from 'spiceflow'
import { Head } from 'spiceflow/react'

// In-memory store for testing stateful page renders
export const projectStore: { id: string; name: string }[] = []

export const app = new Spiceflow()
  .use(({ request }) => {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/admin') && !request.headers.get('authorization')) {
      return new Response('Unauthorized', { status: 401 })
    }
  })
  .get('/api/hello', () => ({ message: 'hello world' }))
  .get('/api/greet/:name', ({ params }) => ({
    greeting: `hello ${params.name}`,
  }))
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Vitest Example</Head.Title>
        </Head>
        <body>{children}</body>
      </html>
    )
  })
  .page('/', async function Home() {
    return (
      <div>
        <h1>Home</h1>
        <p>Welcome to spiceflow</p>
      </div>
    )
  })
  .page('/about', async function About() {
    return (
      <div>
        <h1>About</h1>
        <p>This is the about page</p>
      </div>
    )
  })
  .page('/users/:id', async function UserPage({ params }) {
    return (
      <div>
        <h1>User {params.id}</h1>
        <p>Profile page for user {params.id}</p>
      </div>
    )
  })
  .loader('/dashboard', async () => {
    return { projects: projectStore.map((p) => p.name) }
  })
  .page('/dashboard', async function Dashboard() {
    const { ProjectList } = await import('./project-list.js')
    return (
      <div>
        <h1>Dashboard</h1>
        <div data-testid="projects">
          {projectStore.length === 0 ? (
            <p>No projects yet</p>
          ) : (
            <ul>
              {projectStore.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          )}
        </div>
        <ProjectList />
      </div>
    )
  })
  .get('/api/me', ({ request }) => {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }
    return { user: 'tommy', token: auth.slice(7) }
  })
  .page('/admin', async function Admin() {
    return (
      <div>
        <h1>Admin Panel</h1>
        <p>Secret admin content</p>
      </div>
    )
  })
  .page('/redirect-page', async () => {
    const { redirect } = await import('spiceflow')
    throw redirect('/about')
  })
  .page('/error-page', async () => {
    throw new Error('page exploded')
  })

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
