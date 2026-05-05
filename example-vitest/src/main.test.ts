// Tests that call app.handle() directly on page and API routes.
// Uses the spiceflow-vitest condition to bypass RSC Flight serialization.
// res.text() renders the full page (layouts + page) to HTML.
// res.page gives raw JSX for inline snapshot serialization.
import posthtml from 'posthtml'
import beautify from 'posthtml-beautify'
import { describe, test, expect } from 'vitest'
import { SpiceflowTestResponse, runAction, createTestTracer } from 'spiceflow/testing'
import { createSpiceflowFetch } from 'spiceflow/client'
import { app } from './main.js'
import {
  greetAction,
  signalAwareAction,
  headerReaderAction,
  redirectAction,
  createProject,
  createOrg,
  createOrgProject,
  deleteOrgProject,
} from './actions.js'
import { projectStore, resetAuthStores } from './main.js'

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

  test('mutable .headers field overrides auth after creation', async () => {
    const client = createSpiceflowFetch(app)

    // starts unauthenticated
    const before = await client('/api/me')
    expect(before).toBeInstanceOf(Error)

    // set auth headers after creation
    client.headers = { authorization: 'Bearer late-token' }

    const after = await client('/api/me')
    expect(after).toMatchInlineSnapshot(`
      {
        "token": "late-token",
        "user": "tommy",
      }
    `)

    // clear headers
    client.headers = undefined
    const cleared = await client('/api/me')
    expect(cleared).toBeInstanceOf(Error)
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

    const result = await withKV('/api/settings', {
      method: 'POST',
      body: { theme: 'dark', fontSize: 16 },
    })
    if (result instanceof Error) throw result

    expect(store.get('settings')).toEqual({ theme: 'dark', fontSize: 16 })
  })
})

describe('Tracing', () => {
  test('tracer.text() snapshots the span tree', async () => {
    const tracer = createTestTracer()
    const { Spiceflow } = await import('spiceflow')

    const traced = new Spiceflow({ tracer })
      .get('/api/traced', () => ({ ok: true }))

    await traced.handle(new Request('http://localhost/api/traced'))
    expect(tracer.text()).toMatchInlineSnapshot(`
      "GET /api/traced (200)
      └── handler - /api/traced"
    `)
  })
})

/** posthtml plugin that removes specified attributes from all nodes */
function removeAttrs(attrs: string[]) {
  return (tree: any) => {
    tree.walk((node: any) => {
      if (node.attrs) {
        for (const attr of attrs) delete node.attrs[attr]
      }
      return node
    })
    return tree
  }
}

describe('HTML formatting for snapshots', () => {
  test('strip class and style from page HTML', async () => {
    const res = await f('/styled')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')

    const html = await res.text()
    const { html: clean } = await posthtml([removeAttrs(['class', 'style']), beautify({ rules: { blankLines: '' } })]).process(html)

    expect(clean).toMatchInlineSnapshot(`
      "<html lang="en">
        <head></head>
        <body>
          <div>
            <h1>Styled Page</h1>
            <p>This page has lots of styling attributes</p>
            <button>Click me</button>
          </div>
        </body>
      </html>
      "
    `)
  })

  test('raw HTML preserves all attributes', async () => {
    const res = await f('/styled')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')

    const html = await res.text()
    expect(html).toContain('class="container mx-auto p-4"')
    expect(html).toContain('style="color:red"')
  })

  test('match element by tag and assert attributes, text, children', async () => {
    const res = await f('/styled')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')

    const html = await res.text()
    const matched: { tag: string; attrs: any; text: string; childCount: number }[] = []

    await posthtml()
      .use((tree) => {
        tree.match({ tag: 'button' }, (node) => {
          const text = (node.content || []).filter((c): c is string => typeof c === 'string').join('')
          matched.push({
            tag: node.tag!,
            attrs: (node.attrs || {}),
            text,
            childCount: (node.content || []).length,
          })
          return node
        })
        return tree
      })
      .process(html)

    expect(matched).toMatchInlineSnapshot(`
      [
        {
          "attrs": {
            "class": "bg-blue-500 text-white px-4 py-2 rounded",
          },
          "childCount": 1,
          "tag": "button",
          "text": "Click me",
        },
      ]
    `)
  })
})

describe('Auth workflow', () => {
  test('signup → create org → redirects to dashboard → create project → dashboard shows project → delete project → redirects back', async () => {
    resetAuthStores()

    // 1. Sign up
    const signup = await f('/api/signup', {
      method: 'POST',
      body: { name: 'Alice', email: 'alice@test.com' },
    })
    if (signup instanceof Error) throw signup
    expect(signup).toHaveProperty('userId', '1')
    expect(signup).toHaveProperty('token')
    const token = signup.token
    expect(token).toMatch(/^tok_/)

    const authedClient = createSpiceflowFetch(app, {
      headers: { authorization: `Bearer ${token}` },
    })

    // 2. Create org via action (redirects to /orgs/:orgId/dashboard)
    const orgRedirect = await runAction(() => createOrg('Acme Inc'), {
      request: new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }),
    }).catch((e) => e)
    if (!(orgRedirect instanceof Response)) throw new Error('expected redirect Response')
    expect(orgRedirect.status).toBe(307)
    expect(orgRedirect.headers.get('location')).toBe('/orgs/1/dashboard')

    // 3. Fetch the org dashboard — empty state
    const emptyDashboard = await authedClient('/orgs/:orgId/dashboard', { params: { orgId: '1' } })
    if (!(emptyDashboard instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(emptyDashboard.status).toBe(200)
    expect(emptyDashboard.loaderData).toMatchInlineSnapshot(`
      {
        "orgName": "Acme Inc",
        "projects": [],
      }
    `)
    expect(emptyDashboard.page).toMatchInlineSnapshot(`
      <div>
        <h1>
          Acme Inc
           Dashboard
        </h1>
        <div
          data-testid="org-projects"
        >
          <p>
            No projects yet
          </p>
        </div>
      </div>
    `)

    // 4. Create a project under the org
    const project = await runAction(() => createOrgProject('1', 'Landing Page'), {
      request: new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }),
    })
    expect(project).toMatchInlineSnapshot(`
      {
        "id": "1",
        "name": "Landing Page",
        "orgId": "1",
      }
    `)

    // 5. Dashboard now shows the project
    const filledDashboard = await authedClient('/orgs/:orgId/dashboard', { params: { orgId: '1' } })
    if (!(filledDashboard instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(filledDashboard.loaderData).toMatchInlineSnapshot(`
      {
        "orgName": "Acme Inc",
        "projects": [
          {
            "id": "1",
            "name": "Landing Page",
          },
        ],
      }
    `)
    const html = await filledDashboard.text()
    expect(html).toContain('Landing Page')
    expect(html).not.toContain('No projects yet')

    // 6. Delete the project (redirects back to dashboard)
    const deleteRedirect = await runAction(() => deleteOrgProject('1', '1'), {
      request: new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }),
    }).catch((e) => e)
    if (!(deleteRedirect instanceof Response)) throw new Error('expected redirect Response')
    expect(deleteRedirect.status).toBe(307)
    expect(deleteRedirect.headers.get('location')).toBe('/orgs/1/dashboard')

    // 7. Dashboard is empty again
    const emptyAgain = await authedClient('/orgs/:orgId/dashboard', { params: { orgId: '1' } })
    if (!(emptyAgain instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(await emptyAgain.text()).toContain('No projects yet')
  })

  test('unauthenticated user cannot access org dashboard', async () => {
    resetAuthStores()

    // Create a user and org first
    const signup = await f('/api/signup', {
      method: 'POST',
      body: { name: 'Bob', email: 'bob@test.com' },
    })
    if (signup instanceof Error) throw signup
    const bobToken = signup.token
    await runAction(() => createOrg('Bob Corp'), {
      request: new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: `Bearer ${bobToken}` },
      }),
    }).catch(() => {})

    // Unauthenticated request should fail
    const result = await f('/orgs/:orgId/dashboard', { params: { orgId: '1' } })
    expect(result).toBeInstanceOf(Error)
  })

  test('user cannot access another user org', async () => {
    resetAuthStores()

    // User A creates an org
    const userA = await f('/api/signup', {
      method: 'POST',
      body: { name: 'Alice', email: 'alice@test.com' },
    })
    if (userA instanceof Error) throw userA
    const aliceToken = userA.token
    await runAction(() => createOrg('Alice Corp'), {
      request: new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: `Bearer ${aliceToken}` },
      }),
    }).catch(() => {})

    // User B signs up
    const userB = await f('/api/signup', {
      method: 'POST',
      body: { name: 'Bob', email: 'bob@test.com' },
    })
    if (userB instanceof Error) throw userB
    const bobToken = userB.token

    // User B tries to access Alice's org dashboard
    const forbidden = createSpiceflowFetch(app, {
      headers: { authorization: `Bearer ${bobToken}` },
    })
    const result = await forbidden('/orgs/:orgId/dashboard', { params: { orgId: '1' } })
    expect(result).toBeInstanceOf(Error)
  })
})

// Type safety: invalid paths are compile errors
// @ts-expect-error - path does not exist on this app
void f('/this/path/does/not/exist')
// @ts-expect-error - missing required params
void f('/api/greet/:name')
