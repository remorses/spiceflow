

import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, cloneDeep, Spiceflow } from './spiceflow.js'
import { z } from 'zod'
import { createSpiceflowClient } from './client/index.js'

test('layout and page work together', async () => {
  const res = await new Spiceflow()
    .layout('/xxx', () => ({ layout: 'layout' }))
    .post('/xxx', () => ({ page: 'page' }))
    .handle(new Request('http://localhost/xxx', { method: 'POST' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({
    layout: 'layout',
    page: 'page'
  })
})