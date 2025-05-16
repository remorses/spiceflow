'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('removing a route', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo1': {
        get: {
          description: 'source'
        }
      },
      '/foo2': {
        get: {
          description: 'source'
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo1': {
        get: {
          description: 'source'
        }
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [
      {
        method: 'get',
        path: '/foo1',
        sourceSchema: source.paths['/foo1'].get,
        targetSchema: target.paths['/foo1'].get
      }
    ],
    addedRoutes: [],
    deletedRoutes: [
      {
        method: 'get',
        path: '/foo2',
        sourceSchema: source.paths['/foo2'].get
      }
    ],
    changedRoutes: []
  })
})

test('removing an operation object', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        description: 'source',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      bar: {
                        type: 'integer'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        description: 'target'
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [],
    deletedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get
      }
    ],
    changedRoutes: []
  })
})
