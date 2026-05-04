// Tests that call app.handle() directly on page and API routes.
// Uses the spiceflow-vitest condition to bypass RSC Flight serialization.
// res.text() renders the full page (layouts + page) to HTML.
// res.page gives raw JSX for inline snapshot serialization.
import { describe, test, expect } from 'vitest'
import { SpiceflowTestResponse, runAction } from 'spiceflow/testing'
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
const authed = createSpiceflowFetch(app, {
  headers: { authorization: 'Bearer test-token' },
})

describe('API routes', () => {
  test('GET /api/hello returns json', async () => {
    const result = await f('/api/hello')
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "hello world",
      }
    `)
  })

  test('GET /api/greet/:name with params', async () => {
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
    const res = await f('/')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>Home</h1><p>Welcome to spiceflow</p></div></body></html>"`)
  })

  test('GET /about renders page content', async () => {
    const res = await f('/about')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>About</h1><p>This is the about page</p></div></body></html>"`)
  })

  test('GET /users/:id renders with params', async () => {
    const res = await f('/users/:id', { params: { id: '42' } })
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>User 42</h1><p>Profile page for user 42</p></div></body></html>"`)
  })

  test('res.page gives raw JSX for inline snapshots', async () => {
    const res = await f('/about')
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

  test('res.text(layout) renders single layout with context', async () => {
    const res = await f('/')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text(res.layouts[0]!.element)).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>Home</h1><p>Welcome to spiceflow</p></div></body></html>"`)
  })

  test('page that throws redirect returns error', async () => {
    const res = await f('/redirect-page')
    expect(res).toBeInstanceOf(Error)
  })

  test('page that throws error returns error', async () => {
    const res = await f('/error-page')
    expect(res).toBeInstanceOf(Error)
  })
})

describe('Authentication', () => {
  test('middleware blocks unauthenticated /admin', async () => {
    const res = await f('/admin')
    expect(res).toBeInstanceOf(Error)
  })

  test('middleware allows authenticated /admin', async () => {
    const res = await authed('/admin')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Admin Panel')
  })

  test('authenticated API returns user data', async () => {
    const result = await authed('/api/me')
    expect(result).toMatchInlineSnapshot(`
      {
        "token": "test-token",
        "user": "tommy",
      }
    `)
  })

  test('unauthenticated API returns error', async () => {
    const result = await f('/api/me')
    expect(result).toBeInstanceOf(Error)
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

  test('action with request context via runAction', async () => {
    const result = await runAction(() => signalAwareAction())
    expect(result).toMatchInlineSnapshot(`
      {
        "aborted": false,
        "method": "POST",
      }
    `)
  })

  test('action reads custom request headers', async () => {
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

describe('Stateful workflow', () => {
  test('dashboard: empty → create project → shows project', async () => {
    projectStore.length = 0

    const empty = await f('/dashboard')
    if (!(empty instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await empty.text()).toContain('No projects yet')

    const project = await createProject('My New App')
    expect(project).toMatchInlineSnapshot(`
      {
        "id": "1",
        "name": "My New App",
      }
    `)

    const filled = await f('/dashboard')
    if (!(filled instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    const html = await filled.text()
    expect(html).toContain('My New App')
    expect(html).toContain('Count: 1')
  })
})

describe('Dependency injection with state', () => {
  const store = new Map<string, any>()
  const fakeKV = {
    async get(key: string) { return store.get(key) },
    async put(key: string, value: any) { store.set(key, value) },
  }

  const withKV = createSpiceflowFetch(app, { state: { kv: fakeKV } })

  test('GET /api/settings reads from injected KV', async () => {
    store.clear()
    store.set('settings', { theme: 'dark', language: 'en' })

    const result = await withKV('/api/settings')
    expect(result).toMatchInlineSnapshot(`
      {
        "settings": {
          "language": "en",
          "theme": "dark",
        },
      }
    `)
  })

  test('GET /api/settings returns default when KV is empty', async () => {
    store.clear()

    const result = await withKV('/api/settings')
    expect(result).toMatchInlineSnapshot(`
      {
        "settings": {
          "theme": "light",
        },
      }
    `)
  })

  test('POST /api/settings writes to injected KV', async () => {
    store.clear()

    await withKV('/api/settings', {
      method: 'POST',
      body: { theme: 'dark', fontSize: 16 },
    })

    expect(store.get('settings')).toEqual({ theme: 'dark', fontSize: 16 })
  })
})

// Type safety: invalid paths are compile errors
// @ts-expect-error - path does not exist on this app
void f('/this/path/does/not/exist')
// @ts-expect-error - missing required params
void f('/api/greet/:name')
