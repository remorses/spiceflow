import type { AnySpiceflow, Spiceflow } from '../spiceflow.ts'
import superjson from 'superjson'
import { EventSourceParserStream } from 'eventsource-parser/stream'

import type { SpiceflowClient } from './types.js'

export { SpiceflowClient }

import { SpiceflowFetchError } from './errors.js'

import { parseStringifiedValue } from './utils.js'

import {
  isServer,
  isFile,
  hasFile,
  createNewFile,
  processHeaders,
  streamSSEResponse,
  tryParsingSSEJson,
  superjsonDeserialize,
  TextDecoderStream,
  isAbortError,
  type SSEEvent,
} from './shared.ts'

export { streamSSEResponse, TextDecoderStream }

export { createSpiceflowFetch } from './fetch.ts'
export type { SpiceflowFetch } from './fetch.ts'

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

const createProxy = (
  domain: string,
  config: SpiceflowClient.Config & { state?: any },
  paths: string[] = [],
  instance?: AnySpiceflow,
): any => {
  if (config.state && !instance) {
    throw new Error(`State is only available when using a Spiceflow instance`)
  }
  return new Proxy(() => {}, {
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

        let {
          fetch: fetcher = fetch,
          headers,
          onRequest,
          onResponse,
          retries = 0,
        } = config

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

          if (isGetOrHead)
            delete fetchInit.body

            // Add x-spiceflow-agent header
          ;(fetchInit.headers as Record<string, string>)['x-spiceflow-agent'] =
            'spiceflow-client'

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

          const executeRequest = async (): Promise<Response> => {
            let attempt = 0
            let response: Response
            let lastError: Error | null = null

            while (attempt <= retries) {
              try {
                response = await (instance?.handle(
                  new Request(url, fetchInit),
                  { state: config.state },
                ) ?? fetcher!(url, fetchInit))

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

            if (!response!) {
              throw lastError || new Error('Failed to fetch after retries')
            }

            return response
          }

          const response = await executeRequest()

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
              url,
            }
          }

          switch (response.headers.get('Content-Type')?.split(';')[0]) {
            case 'text/event-stream':
              data = streamSSEResponse({
                response,
                map: (x) => {
                  return tryParsingSSEJson(x.data)
                },
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
            url,
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
}

export const createSpiceflowClient = <const App extends AnySpiceflow>(
  domain: App | string,
  config?: SpiceflowClient.Config &
    (App extends Spiceflow<any, any, infer Singleton, any, any, any, any>
      ? { state?: Singleton['state'] }
      : {}),
): SpiceflowClient.Create<App> => {
  if (typeof domain === 'string') {
    let domainStr = String(domain)
    if (domain.endsWith('/')) domainStr = domain.slice(0, -1)

    return createProxy(domainStr, config || {})
  }

  if (typeof window !== 'undefined')
    console.warn(
      'Spiceflow instance server found on client side, this is not recommended for security reason. Use generic type instead.',
    )

  return createProxy('http://e.ly', config || {}, [], domain)
}
