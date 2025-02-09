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
    TrieRouter {
      "name": "TrieRouter",
    }
  `)

  expect(await res).toMatchInlineSnapshot(`
    Response {
      Symbol(state): {
        "aborted": false,
        "body": {
          "length": 65,
          "source": "{"message":"Cannot read properties of undefined (reading 'map')"}",
          "stream": ReadableStream {
            Symbol(kType): "ReadableStream",
            Symbol(kState): {
              "controller": ReadableByteStreamController {
                Symbol(kType): "ReadableByteStreamController",
                Symbol(kState): {
                  "autoAllocateChunkSize": undefined,
                  "byobRequest": null,
                  "cancelAlgorithm": [Function],
                  "closeRequested": false,
                  "highWaterMark": 0,
                  "pendingPullIntos": [],
                  "pullAgain": false,
                  "pullAlgorithm": [Function],
                  "pulling": false,
                  "queue": [],
                  "queueTotalSize": 0,
                  "started": true,
                  "stream": [Circular],
                },
              },
              "disturbed": false,
              "reader": undefined,
              "state": "readable",
              "storedError": undefined,
              "transfer": {
                "port1": undefined,
                "port2": undefined,
                "promise": undefined,
                "writable": undefined,
              },
            },
            Symbol(nodejs.webstream.isClosedPromise): {
              "promise": Promise {},
              "reject": [Function],
              "resolve": [Function],
            },
            Symbol(nodejs.webstream.controllerErrorFunction): [Function],
          },
        },
        "cacheState": "",
        "headersList": HeadersList {
          "cookies": null,
          Symbol(headers map): Map {
            "content-type" => {
              "name": "content-type",
              "value": "application/json",
            },
          },
          Symbol(headers map sorted): null,
        },
        "rangeRequested": false,
        "requestIncludesCredentials": false,
        "status": 500,
        "statusText": "",
        "timingAllowPassed": false,
        "timingInfo": null,
        "type": "default",
        "urlList": [],
      },
      Symbol(headers): Headers {},
    }
  `)
})
