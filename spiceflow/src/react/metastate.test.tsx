// Tests metadata deduplication and URL normalization rules for Head SSR output.
import React from 'react'
import { describe, expect, test } from 'vitest'
import { MetaState } from './metastate.js'

describe('MetaState', () => {
  test('deduplicates title and metadata by identity', () => {
    const metaState = new MetaState({ baseUrl: 'https://spiceflow.test' })

    metaState.addTag(<title>Default title</title>)
    metaState.addTag(<meta name="description" content="Default description" />)
    metaState.addTag(<meta property="og:title" content="Default OG title" />)
    metaState.addTag(<link rel="canonical" href="https://spiceflow.test/default" />)

    metaState.addTag(<title>Page title</title>)
    metaState.addTag(<meta name="description" content="Page description" />)
    metaState.addTag(<meta property="og:title" content="Page OG title" />)
    metaState.addTag(<link rel="canonical" href="https://spiceflow.test/page" />)

    expect(metaState.getProcessedTags()).toMatchInlineSnapshot(
      '"<title>Page title</title><meta name=\"description\" content=\"Page description\"/><meta property=\"og:title\" content=\"Page OG title\"/><link rel=\"canonical\" href=\"https://spiceflow.test/page\"/>"',
    )
  })

  test('keeps unidentified meta tags and alternate links distinct', () => {
    const metaState = new MetaState()

    metaState.addTag(<meta content="one" />)
    metaState.addTag(<meta content="two" />)
    metaState.addTag(
      <link rel="alternate" hrefLang="en" href="https://spiceflow.test/en" />,
    )
    metaState.addTag(
      <link rel="alternate" hrefLang="it" href="https://spiceflow.test/it" />,
    )

    expect(metaState.getProcessedTags()).toMatchInlineSnapshot(
      '"<meta content=\"one\"/><meta content=\"two\"/><link rel=\"alternate\" hrefLang=\"en\" href=\"https://spiceflow.test/en\"/><link rel=\"alternate\" hrefLang=\"it\" href=\"https://spiceflow.test/it\"/>"',
    )
  })

  test('rewrites only known URL-valued metadata content', () => {
    const metaState = new MetaState({ baseUrl: 'https://spiceflow.test' })

    metaState.addTag(<meta property="og:image" content="/og-image.png" />)
    metaState.addTag(<meta name="twitter:image" content="/twitter-image.png" />)
    metaState.addTag(<meta name="description" content="/docs/intro" />)

    expect(metaState.getProcessedTags()).toMatchInlineSnapshot(
      '"<meta property=\"og:image\" content=\"https://spiceflow.test/og-image.png\"/><meta name=\"twitter:image\" content=\"https://spiceflow.test/twitter-image.png\"/><meta name=\"description\" content=\"/docs/intro\"/>"',
    )
  })
})
