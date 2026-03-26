import { describe, test, expect } from 'vitest'
import { formatServerError } from './format-server-error.js'

describe('formatServerError', () => {
  test('rewrites useState is not a function', () => {
    const err = new TypeError('useState is not a function')
    formatServerError(err)
    expect(err.message).toMatchInlineSnapshot(
      `"useState only works in Client Components. Add the "use client" directive at the top of the file to use it."`,
    )
  })

  test('rewrites useEffect is not a function', () => {
    const err = new TypeError('useEffect is not a function')
    formatServerError(err)
    expect(err.message).toMatchInlineSnapshot(
      `"useEffect only works in Client Components. Add the "use client" directive at the top of the file to use it."`,
    )
  })

  test('rewrites useReducer is not a function', () => {
    const err = new TypeError('useReducer is not a function')
    formatServerError(err)
    expect(err.message).toMatchInlineSnapshot(
      `"useReducer only works in Client Components. Add the "use client" directive at the top of the file to use it."`,
    )
  })

  test('rewrites createContext is not a function', () => {
    const err = new TypeError('createContext is not a function')
    formatServerError(err)
    expect(err.message).toMatchInlineSnapshot(
      `"createContext only works in Client Components. Add the "use client" directive at the top of the file to use it."`,
    )
  })

  test('rewrites transpiled createContext variant', () => {
    const err = new TypeError('(0 , react.createContext) is not a function')
    formatServerError(err)
    expect(err.message).toMatchInlineSnapshot(
      `"createContext only works in Client Components. Add the "use client" directive at the top of the file to use it."`,
    )
  })

  test('rewrites class component error', () => {
    const err = new TypeError(
      'Class extends value undefined is not a constructor or null',
    )
    formatServerError(err)
    expect(err.message).toMatchInlineSnapshot(`
      "Class extends value undefined is not a constructor or null

      React Class Components cannot be rendered in Server Components. Add the "use client" directive at the top of the file."
    `)
  })

  test('does not modify unrelated errors', () => {
    const err = new Error('something else went wrong')
    formatServerError(err)
    expect(err.message).toBe('something else went wrong')
  })

  test('idempotent — calling twice does not double-append for class components', () => {
    const err = new TypeError(
      'Class extends value undefined is not a constructor or null',
    )
    formatServerError(err)
    const after1 = err.message
    formatServerError(err)
    expect(err.message).toBe(after1)
  })

  test('rewrites stack trace first line', () => {
    const err = new TypeError('useState is not a function')
    err.stack = `useState is not a function\n    at Component (file.tsx:5:3)`
    formatServerError(err)
    expect(err.stack).toMatchInlineSnapshot(`
      "useState only works in Client Components. Add the "use client" directive at the top of the file to use it.
          at Component (file.tsx:5:3)"
    `)
  })

  test('handles non-Error values gracefully', () => {
    formatServerError('not an error')
    formatServerError(null)
    formatServerError(undefined)
  })
})
