// Tests that call app.handle() directly on page and API routes.
// Uses the spiceflow-vitest condition to bypass RSC Flight serialization
// and get JSX responses that can be rendered to HTML via res.text().
import { describe, test, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SpiceflowTestResponse, runAction, replaceLayoutContent } from 'spiceflow/testing'
import { router } from 'spiceflow/react'
import { createSpiceflowFetch } from 'spiceflow/client'
import { app } from './main.js'
import {
  greetAction,
  signalAwareAction,
  headerReaderAction,
  redirectAction,
} from './actions.js'

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

describe('Page routes (typed href)', () => {
  test('GET / returns page HTML', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>Home</h1><p>Welcome to spiceflow</p></div></body></html>"`)
  })

  test('GET /about returns page HTML', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/about')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>About</h1><p>This is the about page</p></div></body></html>"`)
  })

  test('GET /users/:id returns page HTML with params', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/users/:id', { id: '42' })}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>User 42</h1><p>Profile page for user 42</p></div></body></html>"`)
  })

  test('layouts are accessible on test response', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.layouts.length).toBeGreaterThan(0)
  })

  test('GET /nonexistent returns 404', async () => {
    const res = await app.handle(new Request('http://localhost/nonexistent'))
    expect(res.status).toBe(404)
  })

  test('page-only JSX snapshot (without layout)', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/about')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(renderToStaticMarkup(res.page)).toMatchInlineSnapshot(
      `"<div><h1>About</h1><p>This is the about page</p></div>"`,
    )
  })

  test('layout-only JSX snapshot (without page)', async () => {
    const res = await app.handle(new Request(`http://localhost${router.href('/')}`))
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.layouts).toHaveLength(1)
    const layoutWithoutChildren = replaceLayoutContent(res.layouts[0]!.element, null)
    expect(renderToStaticMarkup(layoutWithoutChildren)).toMatchInlineSnapshot(`"<html lang="en"><head></head><body></body></html>"`)
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

// Type safety: invalid paths are compile errors
// @ts-expect-error - path does not exist on this app
router.href('/this/path/does/not/exist')
// @ts-expect-error - invalid path for typed fetch
void f('/this/path/does/not/exist')
// @ts-expect-error - missing required params for typed fetch
void f('/api/greet/:name')
