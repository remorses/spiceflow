// Tests for RSC URL helpers in deployment.ts.

import { describe, expect, test } from 'vitest'

import { getDocumentLocationFromResponse, getDocumentPath } from './deployment.js'

describe('getDocumentPath', () => {
  test('strips .rsc extension and __rsc param', () => {
    expect(getDocumentPath(new URL('https://example.com/page.rsc?__rsc=&q=1'))).toBe('/page?q=1')
  })

  test('strips /index.rsc', () => {
    expect(getDocumentPath(new URL('https://example.com/index.rsc?__rsc='))).toBe('/')
  })
})

describe('getDocumentLocationFromResponse', () => {
  test('extracts same-origin location from redirected response', () => {
    const response = new Response(null, { status: 200 })
    // Simulate a redirected response by setting the url and redirected flag
    Object.defineProperty(response, 'redirected', { value: true })
    Object.defineProperty(response, 'url', { value: 'https://example.com/dashboard?tab=settings' })

    const location = getDocumentLocationFromResponse({
      response,
      requestUrl: new URL('https://example.com/page.rsc?__rsc='),
    })

    expect(location).toBe('/dashboard?tab=settings')
  })

  test('falls back to request URL when not redirected', () => {
    const location = getDocumentLocationFromResponse({
      response: new Response(null),
      requestUrl: new URL('https://example.com/page.rsc?__rsc=&q=1'),
    })

    expect(location).toBe('/page?q=1')
  })
})
