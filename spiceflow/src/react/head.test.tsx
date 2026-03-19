// Tests Head SSR collection so nested metadata reaches MetaState before HTML injection.
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { Head, MetaProvider } from './head.js'
import { MetaState } from './metastate.js'

describe('Head', () => {
  test('collects nested head tags during SSR', () => {
    const metaState = new MetaState({ baseUrl: 'https://spiceflow.test' })

    const html = ReactDOMServer.renderToStaticMarkup(
      <MetaProvider metaState={metaState}>
        <Head>
          <>
            <Head.Title>Nested title</Head.Title>
            <Head.Meta name="description" content="Nested description" />
            <div>
              <Head.Meta property="og:image" content="/nested-image.png" />
            </div>
          </>
        </Head>
      </MetaProvider>,
    )

    expect(html).toBe('')
    expect(metaState.getProcessedTags()).toMatchInlineSnapshot(
      '"<title>Nested title</title><meta name=\"description\" content=\"Nested description\"/><meta property=\"og:image\" content=\"https://spiceflow.test/nested-image.png\"/>"',
    )
  })
})
