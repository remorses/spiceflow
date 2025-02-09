import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, cloneDeep, Spiceflow } from './spiceflow.js'
import { z } from 'zod'
import { createSpiceflowClient } from './client/index.js'

test.skip('layout and page work together', async () => {
  const res = await new Spiceflow()
    .layout('/xxx', () => ({ layout: 'layout' }))
    .post('/xxx', () => ({ page: 'page' }))
    .handle(new Request('http://localhost/xxx', { method: 'POST' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({
    layout: 'layout',
    page: 'page',
  })
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
    MedleyRouter {
      "_root": {
        "id": "/",
        "kind": undefined,
        "parametricChild": {
          "id": ":id",
          "paramName": "id",
          "staticChild": null,
          "store": {
            "GET": {
              "handler": [Function],
              "hooks": undefined,
              "kind": "page",
              "method": "GET",
              "path": "/:id",
              "type": "",
              "validateBody": undefined,
              "validateParams": undefined,
              "validateQuery": undefined,
            },
            "POST": {
              "handler": [Function],
              "hooks": undefined,
              "kind": "page",
              "method": "POST",
              "path": "/:id",
              "type": "",
              "validateBody": undefined,
              "validateParams": undefined,
              "validateQuery": undefined,
            },
          },
        },
        "pathPart": "/",
        "staticChildren": null,
        "store": {
          "GET": {
            "handler": [Function],
            "hooks": undefined,
            "kind": "layout",
            "method": "GET",
            "path": "/",
            "type": "",
            "validateBody": undefined,
            "validateParams": undefined,
            "validateQuery": undefined,
          },
          "POST": {
            "handler": [Function],
            "hooks": undefined,
            "kind": "layout",
            "method": "POST",
            "path": "/",
            "type": "",
            "validateBody": undefined,
            "validateParams": undefined,
            "validateQuery": undefined,
          },
        },
        "wildcardStore": null,
      },
      "_storeFactory": [Function],
    }
  `)

  expect(await res).toMatchInlineSnapshot(`
    {
      "layouts": [],
      "page": {
        "page": "123",
      },
    }
  `)
})
