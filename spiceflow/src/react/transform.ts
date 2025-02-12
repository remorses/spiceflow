// ported from https://github.com/devongovett/rsc-html-stream/blob/main/server.js

const encoder = new TextEncoder()
const trailerBody = '</body></html>'

export function injectRSCPayload({
  rscStream,
  appendToHead,
}: {
  rscStream?: ReadableStream<Uint8Array>
  appendToHead?: string
}) {
  let decoder = new TextDecoder()
  let resolveFlightDataPromise: (value: void) => void
  let flightDataPromise = new Promise<void>(
    (resolve) => (resolveFlightDataPromise = resolve),
  )
  let startedRSC = false
  let addedHead = false

  // Buffer all HTML chunks enqueued during the current tick of the event loop (roughly)
  // and write them to the output stream all at once. This ensures that we don't generate
  // invalid HTML by injecting RSC in between two partial chunks of HTML.
  let buffered: Uint8Array[] = []
  let timeout: ReturnType<typeof setTimeout> | null = null
  function flushBufferedChunks(
    controller: TransformStreamDefaultController<Uint8Array>,
  ) {
    for (let chunk of buffered) {
      let buf = decoder.decode(chunk)
      // TODO this relies on html document not having a newline after </body>, can easily break? but react dom currently returns it always together so it's fine?
      if (buf.endsWith(trailerBody)) {
        buf = buf.slice(0, -trailerBody.length)
      }
      // TODO what if the user includes </head> in the html document content?
      if (!addedHead && appendToHead && buf.includes('</head>')) {
        buf = buf.replace('</head>', appendToHead + '\n</head>')
        addedHead = true
      }
      controller.enqueue(encoder.encode(buf))
    }

    buffered.length = 0
    timeout = null
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffered.push(chunk)
      if (timeout) {
        return
      }

      timeout = setTimeout(async () => {
        flushBufferedChunks(controller)
        if (!startedRSC) {
          startedRSC = true
          writeRSCStream(rscStream, controller)
            .catch((err) => controller.error(err))
            .then(() => resolveFlightDataPromise())
        }
      }, 0)
    },
    async flush(controller) {
      await flightDataPromise
      if (timeout) {
        clearTimeout(timeout)
        flushBufferedChunks(controller)
      }
      controller.enqueue(encoder.encode('</body></html>'))
    },
  })
}

async function writeRSCStream(
  rscStream: ReadableStream<Uint8Array> | undefined,
  controller: TransformStreamDefaultController<Uint8Array>,
) {
  let decoder = new TextDecoder('utf-8', { fatal: true })
  if (!rscStream) {
    return
  }
  for await (let chunk of rscStream as any) {
    // Try decoding the chunk to send as a string.
    // If that fails (e.g. binary data that is invalid unicode), write as base64.
    try {
      writeChunk(
        JSON.stringify(decoder.decode(chunk, { stream: true })),
        controller,
      )
    } catch (err) {
      let base64 = JSON.stringify(btoa(String.fromCodePoint(...chunk)))
      writeChunk(
        `Uint8Array.from(atob(${base64}), m => m.codePointAt(0))`,
        controller,
      )
    }
  }

  let remaining = decoder.decode()
  if (remaining.length) {
    writeChunk(JSON.stringify(remaining), controller)
  }
}

function writeChunk(
  chunk: string,
  controller: TransformStreamDefaultController<Uint8Array>,
) {
  controller.enqueue(
    encoder.encode(
      `<script>${escapeScript(`(self.__FLIGHT_DATA||=[]).push(${chunk})`)}</script>`,
    ),
  )
}

// Escape closing script tags and HTML comments in JS content.
// https://www.w3.org/TR/html52/semantics-scripting.html#restrictions-for-contents-of-script-elements
// Avoid replacing </script with <\/script as it would break the following valid JS: 0</script/ (i.e. regexp literal).
// Instead, escape the s character.
function escapeScript(script: string): string {
  return script.replace(/<!--/g, '<\\!--').replace(/<\/(script)/gi, '</\\$1')
}
