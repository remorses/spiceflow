import { afterEach, describe, expect, test, vi } from 'vitest'

import { decodeFederationPayload } from './federated-payload.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('decodeFederationPayload', () => {
  test('decodes async generator payloads', async () => {
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal(
      '__spiceflow_createFromReadableStream',
      vi.fn(async () =>
        (async function* () {
          yield 'stream-1'
          yield 'stream-2'
          yield 'stream-3'
        })(),
      ),
    )

    const response = new Response(
      [
        `event: metadata\ndata: ${JSON.stringify({
          remoteId: 'r_test',
          clientModules: {},
          cssLinks: [],
        })}\n`,
        'event: flight\ndata: 0:{}\n',
        'event: done\ndata: \n',
      ].join('\n'),
      {
        headers: {
          'content-type': 'text/event-stream',
        },
      },
    )

    const decoded = await decodeFederationPayload<AsyncIterable<string>>(response)

    const items: string[] = []
    for await (const item of decoded.value) {
      items.push(item)
    }

    expect(items).toMatchInlineSnapshot(`
      [
        "stream-1",
        "stream-2",
        "stream-3",
      ]
    `)
  })
})
