import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  decodeFederationPayload,
  parseFederationPayload,
} from './federated-payload.js'

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
    for await (const item of decoded) {
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

  test('cancels the SSE response body when parsing stops early', async () => {
    const onCancel = vi.fn()
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `event: metadata\ndata: ${JSON.stringify({
                remoteId: 'r_test',
                clientModules: {},
                cssLinks: [],
              })}\n\n`,
            ),
          )
        },
        cancel() {
          onCancel()
        },
      }),
      {
        headers: {
          'content-type': 'text/event-stream',
        },
      },
    )

    const events = parseFederationPayload(response)
    const firstEvent = await events.next()

    expect(firstEvent.done).toBe(false)
    expect(firstEvent.value).toMatchObject({
      type: 'metadata',
      payload: {
        remoteId: 'r_test',
        clientModules: {},
        cssLinks: [],
      },
    })

    await events.return(undefined)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
