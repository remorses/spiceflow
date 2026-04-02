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
