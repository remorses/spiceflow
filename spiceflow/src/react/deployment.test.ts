// Tests deployment skew helpers for same-origin reload navigation.

import { describe, expect, test } from 'vitest'

import { getDocumentLocationFromResponse } from './deployment.js'

describe('getDocumentLocationFromResponse', () => {
  test('keeps same-origin absolute reload locations on the same origin', () => {
    const location = getDocumentLocationFromResponse({
      response: new Response(null, {
        status: 409,
        headers: {
          'x-spiceflow-reload': 'https://example.com/dashboard?tab=settings',
        },
      }),
      requestUrl: new URL('https://example.com/dashboard?__rsc='),
    })

    expect(location).toBe('/dashboard?tab=settings')
  })

  test('falls back when reload locations change origin', () => {
    const location = getDocumentLocationFromResponse({
      response: new Response(null, {
        status: 409,
        headers: {
          'x-spiceflow-reload': 'https://evil.example/phish',
        },
      }),
      requestUrl: new URL('https://example.com/dashboard?__rsc=&tab=settings'),
    })

    expect(location).toBe('/dashboard?tab=settings')
  })
})
