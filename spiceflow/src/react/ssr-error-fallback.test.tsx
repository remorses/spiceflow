// Tests for SSR error fallback and __NO_HYDRATE pattern.
// When SSR fails, the server renders a minimal error shell with self.__NO_HYDRATE=1
// in the bootstrap script. The browser entry detects this flag and uses createRoot
// instead of hydrateRoot, avoiding hydration mismatch errors.
// Inspired by react-router's data-static-router-test.tsx HTML assertion pattern.
import { describe, expect, it } from 'vitest'
import ReactDOMServer from 'react-dom/server.edge'
import React from 'react'

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode()
  return result
}

describe('SSR error fallback (__NO_HYDRATE)', () => {
  const bootstrapScriptContent = 'import("/entry.client.js")'

  it('error shell injects self.__NO_HYDRATE=1 before the bootstrap script', async () => {
    const errorRoot = (
      <html>
        <head>
          <meta charSet="utf-8" />
        </head>
        <body>
          <noscript>500 Internal Server Error</noscript>
        </body>
      </html>
    )

    const htmlStream = await ReactDOMServer.renderToReadableStream(errorRoot, {
      bootstrapScriptContent: `self.__NO_HYDRATE=1;${bootstrapScriptContent}`,
    })
    const html = await readStream(htmlStream)

    expect(html).toMatchInlineSnapshot(
      `"<!DOCTYPE html><html><head><meta charSet="utf-8"/></head><body><noscript>500 Internal Server Error</noscript><script id="_R_">self.__NO_HYDRATE=1;import("/entry.client.js")</script></body></html>"`,
    )
  })

  it('error shell with 404 status renders with __NO_HYDRATE', async () => {
    const status = 404
    const errorRoot = (
      <html>
        <head>
          <meta charSet="utf-8" />
        </head>
        <body>
          <noscript>{status} Internal Server Error</noscript>
        </body>
      </html>
    )

    const htmlStream = await ReactDOMServer.renderToReadableStream(errorRoot, {
      bootstrapScriptContent: `self.__NO_HYDRATE=1;${bootstrapScriptContent}`,
    })
    const html = await readStream(htmlStream)

    expect(html).toContain('self.__NO_HYDRATE=1')
    expect(html).toContain('404')
  })

  it('normal SSR does not inject __NO_HYDRATE', async () => {
    const normalRoot = (
      <html>
        <head>
          <meta charSet="utf-8" />
        </head>
        <body>
          <div>Hello World</div>
        </body>
      </html>
    )

    const htmlStream = await ReactDOMServer.renderToReadableStream(normalRoot, {
      bootstrapScriptContent,
    })
    const html = await readStream(htmlStream)

    expect(html).not.toContain('__NO_HYDRATE')
    expect(html).toMatchInlineSnapshot(
      `"<!DOCTYPE html><html><head><meta charSet="utf-8"/></head><body><div>Hello World</div><script id="_R_">import("/entry.client.js")</script></body></html>"`,
    )
  })
})

describe('__NO_HYDRATE client detection', () => {
  it('detects __NO_HYDRATE flag via "in" operator on globalThis', () => {
    ;(globalThis as any).__NO_HYDRATE = 1
    expect('__NO_HYDRATE' in globalThis).toBe(true)
    delete (globalThis as any).__NO_HYDRATE
  })

  it('returns false when __NO_HYDRATE is not set', () => {
    delete (globalThis as any).__NO_HYDRATE
    expect('__NO_HYDRATE' in globalThis).toBe(false)
  })

  it('bootstrap script content correctly sets the flag via eval', () => {
    // In the browser, `self` is `globalThis`. Polyfill for Node test environment.
    ;(globalThis as any).self = globalThis
    const script = `self.__NO_HYDRATE=1;`
    eval(script)
    expect('__NO_HYDRATE' in globalThis).toBe(true)
    expect((globalThis as any).__NO_HYDRATE).toBe(1)
    delete (globalThis as any).__NO_HYDRATE
    delete (globalThis as any).self
  })
})
