// Tests Head deduplication so nested metadata renders once.
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { Head, collectHeadElements } from './head.js'
import { getProcessedHeadTagElements } from './head-processing.js'

describe('Head', () => {
  test('deduplicates nested head tags during collection', () => {
    const tags = collectHeadElements(
      <>
        <Head.Title>Nested title</Head.Title>
        <Head.Title>Nested title</Head.Title>
        <Head.Meta name="description" content="Nested description" />
        <Head.Meta name="description" content="Nested description" />
        <div>
          <Head.Meta property="og:image" content="/nested-image.png" />
        </div>
      </>,
    )
    const html = ReactDOMServer.renderToStaticMarkup(
      <>{getProcessedHeadTagElements({ tags })}</>,
    )

    expect(html).toMatchInlineSnapshot(
      '"<title>Nested title</title><meta name=\"description\" content=\"Nested description\"/><meta property=\"og:image\" content=\"/nested-image.png\"/>"',
    )
  })

  test('preserves icons with different media queries', () => {
    const tags = collectHeadElements(
      <>
        <Head.Link
          rel="icon"
          href="/icon-light.png"
          media="(prefers-color-scheme: light)"
        />
        <Head.Link
          rel="icon"
          href="/icon-dark.png"
          media="(prefers-color-scheme: dark)"
        />
      </>,
    )
    const html = ReactDOMServer.renderToStaticMarkup(
      <>{getProcessedHeadTagElements({ tags })}</>,
    )

    expect(html).toMatchInlineSnapshot(
      '"<link rel=\"icon\" href=\"/icon-light.png\" media=\"(prefers-color-scheme: light)\"/><link rel=\"icon\" href=\"/icon-dark.png\" media=\"(prefers-color-scheme: dark)\"/>"',
    )
  })
})
