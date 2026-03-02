import { describe, expect, it } from 'vitest'
import { injectRSCPayload } from './transform.js'

describe('injectRSCPayload', () => {
  it('should inject content into head', async () => {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const htmlContent = `
      <html>
        <head>
        </head>
        <body>
          test
        </body>
      </html>
    `
    const appendHead = '<meta name="test" content="value">'

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(htmlContent))
        controller.close()
      },
    })

    const transform = injectRSCPayload({
      appendToHead: appendHead,
    })

    const transformed = readable.pipeThrough(transform)
    const chunks: Uint8Array[] = []

    const reader = transformed.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const result = decoder.decode(Buffer.concat(chunks))
    expect(result).toMatchInlineSnapshot(`
      "
            <html>
              <head>
              <meta name="test" content="value">
      </head>
              <body>
                test
              </body>
            </html>
          </body></html>"
    `)
    expect(result).toContain('<meta name="test" content="value">')
  })
})
