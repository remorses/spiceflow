/* eslint-disable no-extra-semi */
/* eslint-disable no-case-declarations */
/* eslint-disable prefer-const */
import type { Spiceflow } from '../spiceflow.js'
import superjson from 'superjson'
import { EventSourceParserStream } from 'eventsource-parser/stream'

import type { SpiceflowClient } from './types.js'

export { SpiceflowClient }

import { SpiceflowFetchError } from './errors.js'

import { parseStringifiedValue } from './utils.js'

const method = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
  'head',
  'connect',
  'subscribe',
] as const

const isServer = typeof FileList === 'undefined'

const isFile = (v: any) => {
  if (isServer) return v instanceof Blob

  return v instanceof FileList || v instanceof File
}

// FormData is 1 level deep
const hasFile = (obj: Record<string, any>) => {
  if (!obj) return false

  for (const key in obj) {
    if (isFile(obj[key])) return true

    if (Array.isArray(obj[key]) && (obj[key] as unknown[]).find(isFile))
      return true
  }

  return false
}

const createNewFile = (v: File) =>
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

const processHeaders = (
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
        else
          for (const [k, value] of key)
            headers[k.toLowerCase()] = value as string
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

interface SSEEvent {
  event: string
  data: any
  id?: string
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

export async function* streamSSEResponse(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const body = response.body
  if (!body) return

  const eventStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())

  let reader = eventStream.getReader()
  while (true) {
    const { done, value: event } = await reader.read()
    if (done) break
    if (event?.event === 'error') {
      throw new SpiceflowFetchError(500, superjsonDeserialize(event.data))
    }
    if (event) {
      yield tryParsingSSEJson(event.data)
    }
  }
}

function tryParsingSSEJson(data: string): any {
  try {
    return superjsonDeserialize(JSON.parse(data))
  } catch (error) {
    return null
  }
}

const createProxy = (
  domain: string,
  config: SpiceflowClient.Config,
  paths: string[] = [],
  instance?: Spiceflow<any, any, any, any, any, any>,
): any =>
  new Proxy(() => {}, {
    get(_, param: string): any {
      // handle case where createClient returns a promise and await calls .then on it
      if ((!paths.length && param === 'then') || param === 'catch') {
        return _[param]
      }
      return createProxy(
        domain,
        config,
        param === 'index' ? paths : [...paths, param],
        instance,
      )
    },
    apply(_, __, [body, options]) {
      if (
        !body ||
        options ||
        (typeof body === 'object' && Object.keys(body).length !== 1) ||
        method.includes(paths.at(-1) as any)
      ) {
        const methodPaths = [...paths]
        const method = methodPaths.pop()
        const path = '/' + methodPaths.join('/')

        let { fetch: fetcher = fetch, headers, onRequest, onResponse } = config

        const isGetOrHead =
          method === 'get' || method === 'head' || method === 'subscribe'

        headers = processHeaders(headers, path, options)

        const query = isGetOrHead
          ? (body as Record<string, string | string[] | undefined>)?.query
          : options?.query

        let q = ''
        if (query) {
          const append = (key: string, value: string) => {
            q +=
              (q ? '&' : '?') +
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
          }

          for (const [key, value] of Object.entries(query)) {
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
        }

        return Promise.resolve().then(async () => {
          let fetchInit: RequestInit = {
            method: method?.toUpperCase(),
            body,
            // ...conf,
            headers,
            // credentials: 'include',
          } satisfies RequestInit

          fetchInit.headers = {
            ...headers,
            ...processHeaders(
              // For GET and HEAD, options is moved to body (1st param)
              isGetOrHead ? body?.headers : options?.headers,
              path,
              fetchInit,
            ),
          }

          const fetchOpts =
            isGetOrHead && typeof body === 'object'
              ? body.fetch
              : options?.fetch

          fetchInit = {
            ...fetchInit,
            ...fetchOpts,
          }

          if (isGetOrHead) delete fetchInit.body

          if (onRequest) {
            if (!Array.isArray(onRequest)) onRequest = [onRequest]

            for (const value of onRequest) {
              const temp = await value(path, fetchInit)

              if (typeof temp === 'object')
                fetchInit = {
                  ...fetchInit,
                  ...temp,
                  headers: {
                    ...fetchInit.headers,
                    ...processHeaders(temp.headers, path, fetchInit),
                  },
                }
            }
          }

          // ? Duplicate because end-user might add a body in onRequest
          if (isGetOrHead) delete fetchInit.body

          if (hasFile(body)) {
            const formData = new FormData()

            // FormData is 1 level deep
            for (const [key, field] of Object.entries(fetchInit.body!)) {
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
                  formData.append(
                    key as any,
                    await createNewFile((field as any)[i]),
                  )

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

            // We don't do this because we need to let the browser set the content type with the correct boundary
            // fetchInit.headers['content-type'] = 'multipart/form-data'
            fetchInit.body = formData
          } else if (typeof body === 'object') {
            ;(fetchInit.headers as Record<string, string>)['content-type'] =
              'application/json'

            fetchInit.body = JSON.stringify(body)
          } else if (body !== undefined && body !== null) {
            ;(fetchInit.headers as Record<string, string>)['content-type'] =
              'text/plain'
          }

          if (isGetOrHead) delete fetchInit.body

          if (onRequest) {
            if (!Array.isArray(onRequest)) onRequest = [onRequest]

            for (const value of onRequest) {
              const temp = await value(path, fetchInit)

              if (typeof temp === 'object')
                fetchInit = {
                  ...fetchInit,
                  ...temp,
                  headers: {
                    ...fetchInit.headers,
                    ...processHeaders(temp.headers, path, fetchInit),
                  } as Record<string, string>,
                }
            }
          }

          const url = domain + path + q
          // console.log({ url, fetchInit })
          const response = await (instance?.handle(
            new Request(url, fetchInit),
          ) ?? fetcher!(url, fetchInit))

          let data = null as any
          let error = null as any

          if (onResponse) {
            if (!Array.isArray(onResponse)) onResponse = [onResponse]

            for (const value of onResponse) {
              const temp = await value(response.clone())

              // if (temp !== undefined && temp !== null) {
              //   data = temp
              //   break
              // }
            }
          }

          if (data !== null) {
            return {
              data,
              error,
              response,
              status: response.status,
              headers: response.headers,
            }
          }

          switch (response.headers.get('Content-Type')?.split(';')[0]) {
            case 'text/event-stream':
              data = streamSSEResponse(response)
              break

            case 'application/json':
              data = await response.json()
              data = superjsonDeserialize(data)
              break
            case 'application/octet-stream':
              data = await response.arrayBuffer()
              break

            case 'multipart/form-data':
              const temp = await response.formData()

              data = {}
              temp.forEach((value, key) => {
                // @ts-ignore
                data[key] = value
              })

              break

            default:
              data = await response.text().then(parseStringifiedValue)
          }

          if (response.status >= 300 || response.status < 200) {
            error = new SpiceflowFetchError(
              response.status,
              data || 'Unknown error',
            )
            // console.trace({ error, data })
            data = null
          }

          return {
            data,
            error,
            response,
            status: response.status,
            headers: response.headers,
          }
        })
      }

      if (typeof body === 'object')
        return createProxy(
          domain,
          config,
          [...paths, Object.values(body)[0] as string],
          instance,
        )

      return createProxy(domain, config, paths)
    },
  }) as any

export const createSpiceflowClient = <
  const App extends Spiceflow<any, any, any, any, any, any>,
>(
  domain: string | App,
  config: SpiceflowClient.Config = {},
): SpiceflowClient.Create<App> => {
  if (typeof domain === 'string') {
    if (domain.endsWith('/')) domain = domain.slice(0, -1)

    return createProxy(domain, config)
  }

  if (typeof window !== 'undefined')
    console.warn(
      'Spiceflow instance server found on client side, this is not recommended for security reason. Use generic type instead.',
    )

  return createProxy('http://e.ly', config, [], domain)
}

function superjsonDeserialize(data: any) {
  if (data?.__superjsonMeta) {
    const { __superjsonMeta, ...rest } = data
    return superjson.deserialize({
      json: rest,
      meta: __superjsonMeta,
    })
  }
  return data
}
