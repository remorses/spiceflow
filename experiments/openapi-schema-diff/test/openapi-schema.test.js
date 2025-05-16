'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('should throw if source schema is not an object', () => {
  const source = 3
  const target = { openapi: '1.0.0', paths: {} }

  try {
    compareOpenApiSchemas(source, target)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.message, 'source schema must be an object')
  }
})

test('should throw if target schema is not an object', () => {
  const source = { openapi: '1.0.0', paths: {} }
  const target = 3

  try {
    compareOpenApiSchemas(source, target)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.message, 'target schema must be an object')
  }
})

test('should throw if source schema is null', () => {
  const source = null
  const target = { openapi: '1.0.0', paths: {} }

  try {
    compareOpenApiSchemas(source, target)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.message, 'source schema must be an object')
  }
})

test('should throw if target schema is null', () => {
  const source = { openapi: '1.0.0', paths: {} }
  const target = null

  try {
    compareOpenApiSchemas(source, target)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.message, 'target schema must be an object')
  }
})
