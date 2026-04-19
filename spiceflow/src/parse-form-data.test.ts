import { describe, test, expect } from 'vitest'
import { z } from 'zod'
import { parseFormData, parseFormDataAsync } from './parse-form-data.js'

function makeFormData(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v)
    } else {
      fd.append(key, value)
    }
  }
  return fd
}

describe('parseFormData', () => {
  test('parses flat string fields', () => {
    const schema = z.object({ name: z.string(), email: z.string().email() })
    const fd = makeFormData({ name: 'Alice', email: 'alice@example.com' })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "email": "alice@example.com",
        "name": "Alice",
      }
    `)
  })

  test('coerces string to number', () => {
    const schema = z.object({ age: z.number() })
    const fd = makeFormData({ age: '25' })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "age": 25,
      }
    `)
  })

  test('coerces string to boolean', () => {
    const schema = z.object({ active: z.boolean() })
    const fd = makeFormData({ active: 'true' })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "active": true,
      }
    `)
  })

  test('handles optional fields', () => {
    const schema = z.object({
      name: z.string(),
      bio: z.string().optional(),
    })
    const fd = makeFormData({ name: 'Alice' })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "name": "Alice",
      }
    `)
  })

  test('handles nullable number', () => {
    const schema = z.object({ count: z.number().nullable() })
    const fd = makeFormData({ count: '42' })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "count": 42,
      }
    `)
  })

  test('array fields use getAll', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const fd = makeFormData({ tags: ['a', 'b', 'c'] })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "tags": [
          "a",
          "b",
          "c",
        ],
      }
    `)
  })

  test('array of numbers coerced', () => {
    const schema = z.object({ ids: z.array(z.number()) })
    const fd = makeFormData({ ids: ['1', '2', '3'] })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "ids": [
          1,
          2,
          3,
        ],
      }
    `)
  })

  test('single value for array field wraps in array', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const fd = makeFormData({ tags: 'only-one' })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "tags": [
          "only-one",
        ],
      }
    `)
  })

  test('throws ValidationError on invalid data', () => {
    const schema = z.object({ email: z.string().email() })
    const fd = makeFormData({ email: 'not-an-email' })
    expect(() => parseFormData(schema, fd)).toThrow()
  })

  test('mixed scalar and array fields', () => {
    const schema = z.object({
      title: z.string(),
      score: z.number(),
      tags: z.array(z.string()),
    })
    const fd = makeFormData({ title: 'Post', score: '10', tags: ['a', 'b'] })
    expect(parseFormData(schema, fd)).toMatchInlineSnapshot(`
      {
        "score": 10,
        "tags": [
          "a",
          "b",
        ],
        "title": "Post",
      }
    `)
  })
})

describe('parseFormDataAsync', () => {
  test('works with sync schemas', async () => {
    const schema = z.object({ name: z.string() })
    const fd = makeFormData({ name: 'Alice' })
    expect(await parseFormDataAsync(schema, fd)).toMatchInlineSnapshot(`
      {
        "name": "Alice",
      }
    `)
  })
})
