// Spiceflow app with better-auth authentication.
// Auth is a static import — the database path is configured via AUTH_DB env
// variable (defaults to 'auth.sqlite', set to ':memory:' in vitest config).
import { Spiceflow, redirect } from 'spiceflow'
import { Head } from 'spiceflow/react'
import { auth, db } from './auth.js'

type AuthSession = typeof auth.$Infer.Session | null

export const app = new Spiceflow()
  // Auth middleware — forward /api/auth/* to better-auth
  .use(async ({ request }, next) => {
    if (request.parsedUrl.pathname.startsWith('/api/auth')) {
      const response = await auth.handler(request)
      if (response.ok || response.status !== 404) return response
    }
    return next()
  })
  // Session state — resolved once per request
  .state('session', null as AuthSession)
  .use(async ({ request, state }) => {
    state.session = await auth.api.getSession({
      headers: request.headers,
    })
  })
  // Session loader — available to all pages and client components
  .loader('/*', ({ state }) => {
    return { session: state.session }
  })
  // Layout
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Better Auth Example</Head.Title>
        </Head>
        <body>{children}</body>
      </html>
    )
  })
  // Public page
  .page('/', async function Home() {
    return (
      <div>
        <h1>Home</h1>
        <p>Public page, no auth required</p>
      </div>
    )
  })
  // Protected page — redirects if not authenticated
  .page('/dashboard', async ({ loaderData }) => {
    if (!loaderData.session) throw redirect('/login')
    return (
      <div>
        <h1>Dashboard</h1>
        <p data-testid="user-name">{loaderData.session.user.name}</p>
        <p data-testid="user-email">{loaderData.session.user.email}</p>
      </div>
    )
  })
  // Login page placeholder
  .page('/login', async ({ loaderData }) => {
    if (loaderData.session) throw redirect('/dashboard')
    return (
      <div>
        <h1>Login</h1>
        <p>Please sign in</p>
      </div>
    )
  })
  // Protected API route
  .get('/api/me', ({ state }) => {
    if (!state.session) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    return {
      id: state.session.user.id,
      name: state.session.user.name,
      email: state.session.user.email,
    }
  })
  // Org creation page
  .page('/orgs/new', async ({ loaderData }) => {
    if (!loaderData.session) throw redirect('/login')
    return (
      <div>
        <h1>Create Organization</h1>
        <p>Fill in the form to create your org</p>
      </div>
    )
  })
  // Org dashboard with loader
  .loader('/orgs/:orgId/dashboard', async ({ params, state }) => {
    if (!state.session) return { org: null, projects: [] }
    const org = await db.query.organization.findFirst({
      where: { id: params.orgId },
    })
    if (!org || org.ownerId !== state.session.user.id) return { org: null, projects: [] }
    const projects = await db.query.project.findMany({
      where: { orgId: params.orgId },
    })
    return {
      org: { id: org.id, name: org.name },
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    }
  })
  .page('/orgs/:orgId/dashboard', async ({ loaderData, state }) => {
    if (!state.session) throw redirect('/login')
    if (!loaderData.org) {
      return (
        <div>
          <h1>Not Found</h1>
          <p>Organization not found or access denied</p>
        </div>
      )
    }
    return (
      <div>
        <h1 data-testid="org-name">{loaderData.org.name}</h1>
        <div data-testid="org-projects">
          {loaderData.projects.length === 0 ? (
            <p>No projects yet</p>
          ) : (
            <ul>
              {loaderData.projects.map((p: { id: string; name: string }) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  })

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
