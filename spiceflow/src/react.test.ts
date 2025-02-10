import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, cloneDeep, Spiceflow } from './spiceflow.js'
import { z } from 'zod'
import { createSpiceflowClient } from './client/index.js'

test('layout and page work together', async () => {
  const res = await new Spiceflow()
    .layout('/xxx', () => ({ layout: 'layout' }))
    .page('/xxx', () => ({ page: 'page' }))
    .handle(new Request('http://localhost/xxx', { method: 'POST' }))

  expect(res).toMatchInlineSnapshot(`
    {
      "layouts": [
        {
          "element": {
            "layout": "layout",
          },
          "id": "layout-post--xxx",
        },
      ],
      "page": {
        "page": "page",
      },
      "url": "http://localhost/xxx",
    }
  `)
})
test('layout and page, static routes have priority', async () => {
  const res = await new Spiceflow()
    .layout('/xxx', () => ({ layout: 'layout' }))
    .page('/:id', () => ({ page: ':id' }))
    .page('/xxx', () => ({ page: 'page' }))
    .handle(new Request('http://localhost/xxx', { method: 'POST' }))

  expect(res).toMatchInlineSnapshot(`
    {
      "layouts": [
        {
          "element": {
            "layout": "layout",
          },
          "id": "layout-post--xxx",
        },
      ],
      "page": {
        "page": "page",
      },
      "url": "http://localhost/xxx",
    }
  `)
})

test('layout and page work together with params', async () => {
  const app = new Spiceflow()
    .layout('/', async ({ children }) => ({ layout: 'root', children }))
    .page('/:id', async ({ params }) => ({ page: params.id }))

  const routes = app.getAllRoutes()
  expect(routes).toMatchInlineSnapshot(`
    [
      {
        "handler": [Function],
        "hooks": undefined,
        "id": "layout-get--",
        "kind": "layout",
        "method": "GET",
        "path": "/",
        "type": "",
        "validateBody": undefined,
        "validateParams": undefined,
        "validateQuery": undefined,
      },
      {
        "handler": [Function],
        "hooks": undefined,
        "id": "layout-post--",
        "kind": "layout",
        "method": "POST",
        "path": "/",
        "type": "",
        "validateBody": undefined,
        "validateParams": undefined,
        "validateQuery": undefined,
      },
      {
        "handler": [Function],
        "hooks": undefined,
        "id": "page-get--:id",
        "kind": "page",
        "method": "GET",
        "path": "/:id",
        "type": "",
        "validateBody": undefined,
        "validateParams": undefined,
        "validateQuery": undefined,
      },
      {
        "handler": [Function],
        "hooks": undefined,
        "id": "page-post--:id",
        "kind": "page",
        "method": "POST",
        "path": "/:id",
        "type": "",
        "validateBody": undefined,
        "validateParams": undefined,
        "validateQuery": undefined,
      },
    ]
  `)

  const res = await app.handle(new Request('http://localhost/123'))

  expect(app.router).toMatchInlineSnapshot(`
    TrieRouter {
      "name": "TrieRouter",
    }
  `)

  expect(await res).toMatchInlineSnapshot(`
    {
      "layouts": [],
      "page": {
        "page": "123",
      },
      "url": "http://localhost/123",
    }
  `)
})
