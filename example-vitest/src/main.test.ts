// Tests that call app.handle() directly on page and API routes.
// Uses the spiceflow-vitest condition to bypass RSC Flight serialization.
// res.text() renders the full page (layouts + page) to HTML.
// res.page gives raw JSX for inline snapshot serialization.
import { describe, test, expect } from 'vitest'
import { SpiceflowTestResponse, runAction } from 'spiceflow/testing'
import { router } from 'spiceflow/react'
import { createSpiceflowFetch } from 'spiceflow/client'
import { app } from './main.js'
import {
  greetAction,
  signalAwareAction,
  headerReaderAction,
  redirectAction,
  createProject,
} from './actions.js'
import { projectStore } from './main.js'

const f = createSpiceflowFetch(app)

describe('API routes (typed fetch)', () => {
  test('GET /api/hello returns json', async () => {
    const result = await f('/api/hello')
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "hello world",
      }
    `)
  })

  test('GET /api/greet/:name returns greeting', async () => {
    const result = await f('/api/greet/:name', { params: { name: 'tommy' } })
    expect(result).toMatchInlineSnapshot(`
      {
        "greeting": "hello tommy",
      }
    `)
  })
})

describe('Page routes', () => {
  test('GET / renders full page with layout', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>Home</h1><p>Welcome to spiceflow</p></div></body></html>"`)
  })

  test('GET /about renders page content', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/about')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>About</h1><p>This is the about page</p></div></body></html>"`)
  })

  test('GET /users/:id renders with params', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/users/:id', { id: '42' })}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>User 42</h1><p>Profile page for user 42</p></div></body></html>"`)
  })

  test('res.page gives raw JSX for inline snapshots', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/about')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.page).toMatchInlineSnapshot(`
      <div>
        <h1>
          About
        </h1>
        <p>
          This is the about page
        </p>
      </div>
    `)
  })

  test('res.text(layout) renders layout element with context', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text(res.layouts[0]!.element)).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>Home</h1><p>Welcome to spiceflow</p></div></body></html>"`)
  })

  test('GET /nonexistent returns 404', async () => {
    const res = await app.handle(new Request('http://localhost/nonexistent'))
    expect(res.status).toBe(404)
  })

  test('middleware blocks unauthenticated access to /admin', async () => {
    const res = await app.handle(new Request('http://localhost/admin'))
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  test('middleware allows authenticated access to /admin', async () => {
    const res = await app.handle(
      new Request('http://localhost/admin', {
        headers: { authorization: 'Bearer token' },
      }),
    )
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Admin Panel')
  })

  test('page that throws redirect returns 307 with location', async () => {
    const res = await app.handle(new Request('http://localhost/redirect-page'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('/about')
  })

  test('page that throws error returns 500', async () => {
    const res = await app.handle(new Request('http://localhost/error-page')).catch((e: unknown) => e)
    if (!(res instanceof Response)) throw new Error('expected Response')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.message).toBe('page exploded')
  })
})

describe('Server actions', () => {
  test('pure action can be called directly', async () => {
    const result = await greetAction('tommy')
    expect(result).toMatchInlineSnapshot(`
      {
        "greeting": "hello tommy",
      }
    `)
  })

  test('action that reads request needs runAction', async () => {
    const result = await runAction(() => signalAwareAction())
    expect(result).toMatchInlineSnapshot(`
      {
        "aborted": false,
        "method": "POST",
      }
    `)
  })

  test('action can read custom request headers via runAction', async () => {
    const result = await runAction(() => headerReaderAction(), {
      request: new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
      }),
    })
    expect(result).toMatchInlineSnapshot(`
      {
        "auth": "Bearer test-token",
      }
    `)
  })

  test('redirect action throws a Response', async () => {
    const error = await runAction(() => redirectAction()).catch((e) => e)
    if (!(error instanceof Response)) throw new Error('expected Response')
    expect(error.status).toBe(307)
    expect(error.headers.get('location')).toBe('/about')
  })
})

describe('Stateful page + action workflow', () => {
  test('dashboard starts empty, action creates project, page shows it', async () => {
    projectStore.length = 0

    // Dashboard starts with no projects
    const empty = await app.handle(new Request(`http://localhost${router.href('/dashboard')}`))
    if (!(empty instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await empty.text()).toContain('No projects yet')

    // Call action to create a project
    const project = await createProject('My New App')
    expect(project).toMatchInlineSnapshot(`
      {
        "id": "1",
        "name": "My New App",
      }
    `)

    // Dashboard now shows the project (server + client component with loader data)
    const filled = await app.handle(new Request(`http://localhost${router.href('/dashboard')}`))
    if (!(filled instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    const html = await filled.text()
    expect(html).toContain('My New App')
    expect(html).toContain('Count: 1')
  })
})

describe('Authenticated fetch', () => {
  test('API route with bearer token via createSpiceflowFetch headers', async () => {
    const authedFetch = createSpiceflowFetch(app, {
      headers: { authorization: 'Bearer my-secret-token' },
    })
    const result = await authedFetch('/api/me')
    expect(result).toMatchInlineSnapshot(`
      {
        "token": "my-secret-token",
        "user": "tommy",
      }
    `)
  })

  test('API route without token returns 401', async () => {
    const result = await f('/api/me')
    expect(result).toBeInstanceOf(Error)
  })
})

// Type safety: invalid paths are compile errors
// @ts-expect-error - path does not exist on this app
router.href('/this/path/does/not/exist')
// @ts-expect-error - invalid path for typed fetch
void f('/this/path/does/not/exist')
// @ts-expect-error - missing required params for typed fetch
void f('/api/greet/:name')
