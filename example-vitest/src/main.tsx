// Spiceflow app for vitest integration testing.
// Tests call app.handle() directly to verify page and API route responses.
import { Spiceflow } from 'spiceflow'
import { Head } from 'spiceflow/react'

// In-memory store for testing stateful page renders
export const projectStore: { id: string; name: string }[] = []

// Production KV store (replaced with a fake in tests via state injection)
export const productionKV: KVStore = {
  async get() { return null },
  async put() {},
}

// In-memory stores for auth workflow tests
export const userStore: { id: string; name: string; email: string; token: string }[] = []
export const orgStore: { id: string; name: string; ownerId: string }[] = []
export const orgProjectStore: { id: string; orgId: string; name: string }[] = []

let nextUserId = 1
let nextOrgId = 1
let nextOrgProjectId = 1

export function resetAuthStores() {
  userStore.length = 0
  orgStore.length = 0
  orgProjectStore.length = 0
  nextUserId = 1
  nextOrgId = 1
  nextOrgProjectId = 1
}

export function signupUser(name: string, email: string) {
  const id = String(nextUserId++)
  const token = `tok_${id}_${Date.now()}`
  const user = { id, name, email, token }
  userStore.push(user)
  return user
}

export function getUserByToken(token: string) {
  return userStore.find((u) => u.token === token) ?? null
}

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
  .state('kv', productionKV)
  .get('/api/me', ({ request }) => {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }
    return { user: 'tommy', token: auth.slice(7) }
  })
  .get('/api/settings', async ({ state }) => {
    const settings = await state.kv.get('settings')
    return { settings: settings ?? { theme: 'light' } }
  })
  .post('/api/settings', async ({ state, request }) => {
    const body = await request.json()
    await state.kv.put('settings', body)
    return { ok: true }
  })
  .page('/admin', async function Admin() {
    return (
      <div>
        <h1>Admin Panel</h1>
        <p>Secret admin content</p>
      </div>
    )
  })
  .post('/api/signup', async ({ request }) => {
    const body = await request.json() as { name: string; email: string }
    const user = signupUser(body.name, body.email)
    return { userId: user.id, token: user.token }
  })
  .use(({ request }) => {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/orgs/')) return
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }
    const user = getUserByToken(auth.slice(7))
    if (!user) return new Response('Unauthorized', { status: 401 })
    const orgId = url.pathname.split('/')[2]
    const org = orgStore.find((o) => o.id === orgId)
    if (!org) return new Response('Not Found', { status: 404 })
    if (org.ownerId !== user.id) {
      return new Response('Forbidden', { status: 403 })
    }
  })
  .page('/create-org', async function CreateOrg() {
    return (
      <div>
        <h1>Create Organization</h1>
        <p>Fill in the form to create your org</p>
      </div>
    )
  })
  .loader('/orgs/:orgId/dashboard', async ({ params }) => {
    const org = orgStore.find((o) => o.id === params.orgId)
    const projects = orgProjectStore.filter((p) => p.orgId === params.orgId)
    return {
      orgName: org?.name ?? 'Unknown',
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    }
  })
  .page('/orgs/:orgId/dashboard', async function OrgDashboard({ params }) {
    const org = orgStore.find((o) => o.id === params.orgId)
    const projects = orgProjectStore.filter((p) => p.orgId === params.orgId)
    return (
      <div>
        <h1>{org?.name ?? 'Unknown'} Dashboard</h1>
        <div data-testid="org-projects">
          {projects.length === 0 ? (
            <p>No projects yet</p>
          ) : (
            <ul>
              {projects.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  })
  .page('/styled', async function StyledPage() {
    return (
      <div className="container mx-auto p-4" style={{ color: 'red' }}>
        <h1 className="text-2xl font-bold mb-2">Styled Page</h1>
        <p className="text-gray-600" style={{ fontSize: '14px' }}>
          This page has lots of styling attributes
        </p>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Click me
        </button>
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

export interface KVStore {
  get(key: string): Promise<any>
  put(key: string, value: any): Promise<void>
}

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
