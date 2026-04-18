// Tests for deployment-id integration with Spiceflow request handling.
// Isolated in its own file with a hoisted vi.mock for #deployment-id so
// the mock is registered before any import — avoids flaky dynamic
// import cache races that occurred with vi.doMock in spiceflow.test.ts.
import { test, expect, vi } from 'vitest'

vi.mock('#deployment-id', () => ({
  getDeploymentId: async () => 'deploy-123',
}))

import { Spiceflow } from './spiceflow.tsx'

test('document requests set a deployment cookie when a deployment id is available', async () => {
  const res = await new Spiceflow()
    .get('/', () => 'ok')
    .handle(
      new Request('http://localhost/', {
        headers: {
          'sec-fetch-dest': 'document',
        },
      }),
    )

  expect(res.headers.get('set-cookie')).toContain(
    'spiceflow-deployment=deploy-123',
  )
})

test('rsc deployment mismatch returns a same-origin relative reload path', async () => {
  const res = await new Spiceflow()
    .get('/', () => 'ok')
    .handle(
      new Request('http://internal-proxy/app/page.rsc?__rsc=&q=1', {
        headers: {
          cookie: 'spiceflow-deployment=deploy-old',
        },
      }),
    )

  expect(res.status).toBe(409)
  expect(res.headers.get('x-spiceflow-reload')).toBe('/app/page?q=1')
})

test('server action with stale deployment cookie executes normally (no skew block)', async () => {
  const app = new Spiceflow().post('/dashboard', () => 'action-ran')
  const res = await app.handle(
    new Request('http://localhost/dashboard?__rsc=action-id', {
      method: 'POST',
      headers: {
        cookie: 'spiceflow-deployment=deploy-old',
      },
      body: 'payload',
    }),
  )

  // Actions are allowed through even with a stale deployment cookie because
  // client reference IDs are stable and old chunks remain on CDN.
  expect(res.status).not.toBe(409)
  expect(await res.text()).toContain('action-ran')
})

test('rsc navigation with matching deployment cookie skips mismatch', async () => {
  const res = await new Spiceflow()
    .get('/page', () => 'ok')
    .handle(
      new Request('http://localhost/page.rsc?__rsc=', {
        headers: {
          cookie: 'spiceflow-deployment=deploy-123',
        },
      }),
    )

  expect(res.status).not.toBe(409)
})

test('server action with matching deployment cookie executes normally', async () => {
  const app = new Spiceflow().post('/api', () => 'action-result')
  const res = await app.handle(
    new Request('http://localhost/api?__rsc=action-id', {
      method: 'POST',
      headers: {
        cookie: 'spiceflow-deployment=deploy-123',
      },
      body: 'payload',
    }),
  )

  expect(res.status).not.toBe(409)
  expect(await res.text()).toContain('action-result')
})
