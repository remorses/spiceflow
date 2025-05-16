'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('should throw source schema version is missing', () => {
  const source = { paths: {} }
  const target = { openapi: '1.0.0', paths: {} }

  try {
    compareOpenApiSchemas(source, target)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.message, 'source schema version must be a string')
  }
})

test('should throw target schema version is missing', () => {
  const source = { openapi: '1.0.0', paths: {} }
  const target = { paths: {} }

  try {
    compareOpenApiSchemas(source, target)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.message, 'target schema version must be a string')
  }
})

test('should throw if major version does not equal', () => {
  const source = { openapi: '2.0.0', paths: {} }
  const target = { openapi: '1.0.0', paths: {} }

  try {
    compareOpenApiSchemas(source, target)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.message, 'source and target schemas must have the same major version')
  }
})

test('should not throw if minor version does not equal', () => {
  const source = { openapi: '1.1.0', paths: {} }
  const target = { openapi: '1.0.0', paths: {} }

  const { isEqual } = compareOpenApiSchemas(source, target)
  assert.strictEqual(isEqual, true)
})

test('should not throw if path version does not equal', () => {
  const source = { openapi: '1.1.1', paths: {} }
  const target = { openapi: '1.1.0', paths: {} }

  const { isEqual } = compareOpenApiSchemas(source, target)
  assert.strictEqual(isEqual, true)
})
