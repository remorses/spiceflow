'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('adding response header schema property', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {}
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              headers: {
                'x-header-foo': {
                  schema: {
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

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get,
        changes: [
          {
            type: 'responseHeader',
            statusCode: '200',
            header: 'x-header-foo',
            action: 'added',
            sourceSchema: undefined,
            targetSchema: target.paths['/foo'].get.responses['200'].headers['x-header-foo'],
            comment: 'response header for "200" status code has been added to GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('removing response header schema property', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              headers: {
                'x-header-foo': {
                  schema: {
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

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {}
          }
        }
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get,
        changes: [
          {
            type: 'responseHeader',
            statusCode: '200',
            header: 'x-header-foo',
            action: 'deleted',
            sourceSchema: source.paths['/foo'].get.responses['200'].headers['x-header-foo'],
            targetSchema: undefined,
            comment: 'response header for "200" status code has been deleted from GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('changing response header schema property', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              headers: {
                'x-header-foo': {
                  schema: {
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

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              headers: {
                'x-header-foo': {
                  schema: {
                    type: 'string'
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
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get,
        changes: [
          {
            type: 'responseHeader',
            action: 'changed',
            statusCode: '200',
            header: 'x-header-foo',
            sourceSchema: source.paths['/foo'].get.responses['200'].headers['x-header-foo'],
            targetSchema: target.paths['/foo'].get.responses['200'].headers['x-header-foo'],
            changes: [
              {
                keyword: 'schema',
                changes: [
                  {
                    jsonPath: '#/type',
                    source: 'integer',
                    target: 'string'
                  }
                ],
                comment: 'response header schema has been changed'
              }
            ],
            comment: 'response header for "200" status code has been changed in GET "/foo" route'
          }
        ]
      }
    ]
  })
})
