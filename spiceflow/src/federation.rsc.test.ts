// Tests the federation SSE encoder stream behavior and cancellation cleanup.
import { beforeEach, describe, expect, test, vi } from 'vitest'

let cancelFlightStream = vi.fn()

vi.mock('#rsc-runtime', () => ({
  renderToReadableStream() {
    let sent = false
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent) return
        sent = true
        controller.enqueue(new TextEncoder().encode('0:{"ok":true}\n1:{"ok":false}\n'))
      },
      cancel() {
        cancelFlightStream()
      },
    })
  },
}))

import { encodeFederationPayload } from './federation.rsc.ts'

describe('encodeFederationPayload', () => {
  beforeEach(() => {
    cancelFlightStream = vi.fn()
  })

  test('streams SSE events incrementally with streaming-safe headers', async () => {
    const response = await encodeFederationPayload({ message: 'hello' })

    expect(response.headers.get('content-type')).toBe(
      'text/event-stream; charset=utf-8',
    )
    expect(response.headers.get('content-encoding')).toBe('none')

    const reader = response.body?.getReader()
    expect(reader).toBeDefined()

    const decoder = new TextDecoder()
    const firstChunk = decoder.decode((await reader!.read()).value)
    const secondChunk = decoder.decode((await reader!.read()).value)
    const thirdChunk = decoder.decode((await reader!.read()).value)

    expect(firstChunk).toContain('event: metadata\n')
    expect(firstChunk).toContain('"clientModules":{}')
    expect(firstChunk).toContain('"cssLinks":[]')
    expect(secondChunk).toBe('event: ssr\ndata: {"html":""}\n\n')
    expect(thirdChunk).toBe('event: flight\ndata: 0:{"ok":true}\n\n')

    await reader!.cancel()
  })

  test('cancels the underlying flight stream when the consumer aborts', async () => {
    const response = await encodeFederationPayload({ message: 'hello' })
    const reader = response.body!.getReader()

    await reader.read()
    await reader.read()
    await reader.read()
    await reader.cancel()

    expect(cancelFlightStream).toHaveBeenCalledTimes(1)
  })
})
