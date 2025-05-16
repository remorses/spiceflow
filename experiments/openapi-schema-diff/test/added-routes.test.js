'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('adding new route', () => {
  const source = {
    openapi: '1.0.0',
    paths: {}
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
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

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [
      {
        method: 'get',
        path: '/foo',
        targetSchema: target.paths['/foo'].get
      }
    ],
    deletedRoutes: [],
    changedRoutes: []
  })
})

test('adding new operation object', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        description: 'target'
      }
    }
  }

  const target = {
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

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [
      {
        method: 'get',
        path: '/foo',
        targetSchema: target.paths['/foo'].get
      }
    ],
    deletedRoutes: [],
    changedRoutes: []
  })
})
