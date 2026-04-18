// Tests that deployment-id is available and exported but does not
// interfere with request handling (no cookie, no 409 mismatch).
import { test, expect, vi } from 'vitest'

vi.mock('#deployment-id', () => ({
  getDeploymentId: async () => 'deploy-123',
}))

import { Spiceflow } from './spiceflow.tsx'

test('rsc navigation with any deployment state executes normally', async () => {
  const res = await new Spiceflow()
    .get('/page', () => 'ok')
    .handle(
      new Request('http://localhost/page.rsc?__rsc=', {
        headers: {
          cookie: 'spiceflow-deployment=deploy-old',
        },
      }),
    )

  expect(res.status).not.toBe(409)
})

test('server action with any deployment state executes normally', async () => {
  const app = new Spiceflow().post('/api', () => 'action-result')
  const res = await app.handle(
    new Request('http://localhost/api?__rsc=action-id', {
      method: 'POST',
      headers: {
        cookie: 'spiceflow-deployment=deploy-old',
      },
      body: 'payload',
    }),
  )

  expect(res.status).not.toBe(409)
  expect(await res.text()).toContain('action-result')
})
