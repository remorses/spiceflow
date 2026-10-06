// Tests for RSC URL helpers and deployment skew detection in deployment.ts.

import { describe, expect, test } from 'vitest'

import {
  CLIENT_DEPLOYMENT_ID_GLOBAL,
  DEPLOYMENT_ID_HEADER,
  deploymentIdBootstrapPrefix,
  getDocumentLocationFromResponse,
  getDocumentPath,
  isDeploymentSkew,
  readClientDeploymentId,
  wrapRequireWithFallback,
} from './deployment.js'

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

describe('isDeploymentSkew', () => {
  test('false when either id is missing', () => {
    expect(isDeploymentSkew({ clientDeploymentId: '', serverDeploymentId: 'a' })).toBe(false)
    expect(isDeploymentSkew({ clientDeploymentId: 'a', serverDeploymentId: null })).toBe(false)
    expect(isDeploymentSkew({ clientDeploymentId: 'a', serverDeploymentId: '' })).toBe(false)
  })

  test('false when ids match', () => {
    expect(isDeploymentSkew({ clientDeploymentId: 'abc', serverDeploymentId: 'abc' })).toBe(false)
  })

  test('true when both present and differ', () => {
    expect(isDeploymentSkew({ clientDeploymentId: 'old', serverDeploymentId: 'new' })).toBe(true)
  })
})

describe('deploymentIdBootstrapPrefix', () => {
  test('empty when no id', () => {
    expect(deploymentIdBootstrapPrefix('')).toBe('')
  })

  test('stamps global before client entry', () => {
    expect(deploymentIdBootstrapPrefix('lk3m2p9')).toBe(
      `self.${CLIENT_DEPLOYMENT_ID_GLOBAL}=${JSON.stringify('lk3m2p9')};`,
    )
  })
})

describe('readClientDeploymentId', () => {
  test('reads string global', () => {
    const g = { [CLIENT_DEPLOYMENT_ID_GLOBAL]: 'deploy-1' } as unknown as typeof globalThis
    expect(readClientDeploymentId(g)).toBe('deploy-1')
  })

  test('empty for missing or non-string', () => {
    expect(readClientDeploymentId({} as unknown as typeof globalThis)).toBe('')
    const g = { [CLIENT_DEPLOYMENT_ID_GLOBAL]: 42 } as unknown as typeof globalThis
    expect(readClientDeploymentId(g)).toBe('')
  })
})

describe('DEPLOYMENT_ID_HEADER', () => {
  test('stable header name', () => {
    expect(DEPLOYMENT_ID_HEADER).toBe('x-spiceflow-deployment-id')
  })
})

describe('wrapRequireWithFallback', () => {
  test('keeps one promise per id, but a failed id asks the fallback again', async () => {
    const calls: string[] = []
    const require = wrapRequireWithFallback(
      // Like the vite-rsc loader: memoized, so a missing id stays rejected
      (id) => (id === 'ok' ? Promise.resolve({ ok: true }) : Promise.reject(new Error(`missing ${id}`))),
      (id, _cleanId, cause) => {
        calls.push(id)
        throw cause
      },
    )
    const ok = require('ok')
    const firstMiss = require('gone') as Promise<unknown>
    await firstMiss.catch(() => {})
    const secondMiss = require('gone') as Promise<unknown>
    await secondMiss.catch(() => {})
    expect({
      okIsCached: require('ok') === ok,
      missIsNew: firstMiss !== secondMiss,
      fallbackCalls: calls,
    }).toMatchInlineSnapshot(`
      {
        "fallbackCalls": [
          "gone",
          "gone",
        ],
        "missIsNew": true,
        "okIsCached": true,
      }
    `)
  })
})
