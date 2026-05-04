// Shared utilities used by both the proxy client and the fetch client
import superjson from 'superjson'
import { EventSourceParserStream } from 'eventsource-parser/stream'

import type { SpiceflowClient } from './types.ts'
import { SpiceflowFetchError } from './errors.ts'
import { parseStringifiedValue } from './utils.ts'
import type { AnySpiceflow } from '../spiceflow.ts'

export const isServer = typeof FileList === 'undefined'

export const isFile = (v: any) => {
  if (isServer) return v instanceof Blob
  return v instanceof FileList || v instanceof File
}

export const hasFile = (obj: Record<string, any>) => {
  if (!obj) return false
  for (const key in obj) {
    if (isFile(obj[key])) return true
    if (Array.isArray(obj[key]) && (obj[key] as unknown[]).find(isFile))
      return true
  }
  return false
}

export const createNewFile = (v: File) =>
  isServer
    ? v
    : new Promise<File>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const file = new File([reader.result!], v.name, {
            lastModified: v.lastModified,
            type: v.type,
          })
          resolve(file)
        }
        reader.readAsArrayBuffer(v)
      })

export const processHeaders = (
  h: SpiceflowClient.Config['headers'],
  path: string,
  options: RequestInit = {},
  headers: Record<string, string> = {},
): Record<string, string> => {
  if (Array.isArray(h)) {
    for (const value of h)
      if (!Array.isArray(value))
        headers = processHeaders(value, path, options, headers)
      else {
        const key = value[0]
        if (typeof key === 'string')
          headers[key.toLowerCase()] = value[1] as string
        else for (const [k, value] of key) headers[k.toLowerCase()] = value
      }
    return headers
  }

  if (!h) return headers

  switch (typeof h) {
    case 'function':
      if (typeof Headers !== 'undefined' && h instanceof Headers)
        return processHeaders(h, path, options, headers)
      const v = h(path, options)
      if (v) return processHeaders(v, path, options, headers)
      return headers

    case 'object':
      if (typeof Headers !== 'undefined' && h instanceof Headers) {
        h.forEach((value, key) => {
          headers[key.toLowerCase()] = value
        })
        return headers
      }
      for (const [key, value] of Object.entries(h))
        headers[key.toLowerCase()] = value as string
      return headers

    default:
      return headers
  }
}

export interface SSEEvent {
  event?: string
  data: any
  id?: string
}

export function bindAbortToReader({
  reader,
  signal,
}: {
  reader: ReadableStreamDefaultReader<unknown>
  signal?: AbortSignal
}) {
  if (!signal) return () => {}

  const abortRead = () => {
    void reader.cancel().catch(() => undefined)
  }

  if (signal.aborted) {
    abortRead()
    return () => {}
  }

  signal.addEventListener('abort', abortRead, { once: true })
  return () => {
    signal.removeEventListener('abort', abortRead)
  }
}

export class TextDecoderStream extends TransformStream<Uint8Array, string> {
  constructor() {
    const decoder = new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: true,
    })
    super({
      transform(
        chunk: Uint8Array,
        controller: TransformStreamDefaultController<string>,
      ) {
        const decoded = decoder.decode(chunk, { stream: true })
        if (decoded.length > 0) {
          controller.enqueue(decoded)
        }
      },
      flush(controller: TransformStreamDefaultController<string>) {
        const output = decoder.decode()
        if (output.length > 0) {
          controller.enqueue(output)
        }
      },
    })
  }
}

export function isAbortError(error: unknown): error is Error {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    (error.name === 'AbortError' ||
      error.name === 'ResponseAborted' || // Next.js
      error.name === 'TimeoutError')
  )
}

export async function* streamSSEResponse({
  response,
  map,
  executeRequest,
  maxRetries = 0,
  signal,
}: {
  response: Response
  map: (x: SSEEvent) => any
  executeRequest?: () => Promise<Response>
  maxRetries?: number
  signal?: AbortSignal
}): AsyncGenerator<SSEEvent> {
  let currentResponse = response
  let retriesLeft = maxRetries

  while (true) {
    const body = currentResponse.body
    if (!body) return

    const eventStream = body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream())

    const reader = eventStream.getReader()
    const unbindAbort = bindAbortToReader({ reader, signal })
    let finished = false

    try {
      while (true) {
        const { done, value: event } = await reader.read()
        if (done) {
          finished = true
          return
        }

        if (event?.event === 'error') {
          const error = superjsonDeserialize(event.data)
          throw new SpiceflowFetchError(500, error)
        }

        if (event) {
          yield map({ ...event, data: event.data })
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      if (
        executeRequest &&
        error instanceof SpiceflowFetchError &&
        error.status >= 500 &&
        retriesLeft > 0
      ) {
        retriesLeft--
        const backoffMs = Math.min(
          1000 * 2 ** (maxRetries - retriesLeft - 1),
          10000,
        )
        await new Promise((resolve) => setTimeout(resolve, backoffMs))

        try {
          currentResponse = await executeRequest()
          if (currentResponse.status >= 500) {
            if (retriesLeft === 0) {
              throw error
            }
            continue
          }
        } catch (retryError) {
          if (retriesLeft === 0) {
            throw retryError
          }
          continue
        }
      } else {
        throw error
      }
    } finally {
      unbindAbort()
      if (!finished) {
        await reader.cancel().catch(() => undefined)
      }
      reader.releaseLock()
    }
  }
}

export function tryParsingSSEJson(data: string): any {
  try {
    return superjsonDeserialize(JSON.parse(data))
  } catch (error) {
    return data
  }
}

export function superjsonDeserialize(data: any) {
  if (data?.__superjsonMeta) {
    const { __superjsonMeta, ...rest } = data
    return superjson.deserialize({
      json: rest,
      meta: __superjsonMeta,
    })
  }
  return data
}

export function buildQueryString(
  query:
    | Record<
        string,
        string | string[] | number | boolean | object | undefined | null
      >
    | undefined,
): string {
  if (!query) return ''
  let q = ''
  const append = (key: string, value: string) => {
    q +=
      (q ? '&' : '?') +
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const v of value) append(key, v)
      continue
    }
    if (typeof value === 'object') {
      append(key, JSON.stringify(value))
      continue
    }
    append(key, `${value}`)
  }
  return q
}

export async function serializeBody({
  body,
  fetchInit,
  isGetOrHead,
}: {
  body: any
  fetchInit: RequestInit
  isGetOrHead: boolean
}): Promise<void> {
  if (isGetOrHead) {
    delete fetchInit.body
    return
  }

  if (hasFile(body)) {
    const formData = new FormData()
    for (const [key, field] of Object.entries(body)) {
      if (isServer) {
        formData.append(key, field as any)
        continue
      }
      if (field instanceof File) {
        formData.append(key, await createNewFile(field as any))
        continue
      }
      if (field instanceof FileList) {
        for (let i = 0; i < field.length; i++)
          formData.append(key as any, await createNewFile((field as any)[i]))
        continue
      }
      if (Array.isArray(field)) {
        for (let i = 0; i < field.length; i++) {
          const value = (field as any)[i]
          formData.append(
            key as any,
            value instanceof File ? await createNewFile(value) : value,
          )
        }
        continue
      }
      formData.append(key, field as string)
    }
    fetchInit.body = formData
  } else if (typeof body === 'object' && body !== null) {
    ;(fetchInit.headers as Record<string, string>)['content-type'] =
      'application/json'
    fetchInit.body = JSON.stringify(body)
  } else if (body !== undefined && body !== null) {
    ;(fetchInit.headers as Record<string, string>)['content-type'] =
      'text/plain'
    fetchInit.body = body
  }
}

export async function parseResponseData({
  response,
  executeRequest,
  retries,
}: {
  response: Response
  executeRequest: () => Promise<Response>
  retries: number
}): Promise<{ data: any; error: any }> {
  // In vitest mode, SpiceflowTestResponse carries JSX directly.
  // Return it as-is so createSpiceflowFetch(app) can be used in tests.
  if (response.constructor.name === 'SpiceflowTestResponse') {
    return { data: response, error: null }
  }

  let data = null as any
  let error = null as any

  switch (response.headers.get('Content-Type')?.split(';')[0]) {
    case 'text/event-stream':
      data = streamSSEResponse({
        response,
        map: (x) => tryParsingSSEJson(x.data),
        executeRequest,
        maxRetries: retries,
      })
      break

    case 'application/json':
      data = await response.json()
      data = superjsonDeserialize(data)
      break

    case 'application/octet-stream':
      data = await response.arrayBuffer()
      break

    case 'multipart/form-data': {
      const temp = await response.formData()
      data = {}
      temp.forEach((value, key) => {
        data[key] = value
      })
      break
    }

    default:
      data = await response.text().then(parseStringifiedValue)
  }

  if (response.status >= 300 || response.status < 200) {
    error = new SpiceflowFetchError(response.status, data || 'Unknown error')
    data = null
  }

  return { data, error }
}

export async function executeWithRetries({
  url,
  fetchInit,
  fetcher,
  instance,
  state,
  retries,
}: {
  url: string
  fetchInit: RequestInit
  fetcher: typeof fetch
  instance?: AnySpiceflow
  state?: any
  retries: number
}): Promise<Response> {
  let attempt = 0
  let response!: Response
  let lastError: Error | null = null

  while (attempt <= retries) {
    try {
      response = await (instance?.handle(new Request(url, fetchInit), {
        state,
      }) ?? fetcher(url, fetchInit))

      if (response.status < 500 || attempt === retries) {
        break
      }

      lastError = new Error(
        `Server error: ${response.status} ${response.statusText}`,
      )
    } catch (err) {
      lastError = err as Error
      if (attempt === retries) {
        throw err
      }
    }

    attempt++
    const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 10000)
    await new Promise((resolve) => setTimeout(resolve, backoffMs))
  }

  if (!response) {
    throw lastError || new Error('Failed to fetch after retries')
  }

  return response
}
