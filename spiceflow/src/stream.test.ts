import { describe, it, expect } from 'vitest'

import { createParser } from 'eventsource-parser'

import { Spiceflow } from './spiceflow.js'

import { req, sleep } from './utils.js'

function textEventStream(items: string[]) {
  return items
    .map((item) => `event: message\ndata: ${JSON.stringify(item)}\n\n`)
    .join('')
}

function parseTextEventStreamItem(item: string) {
  const data = item.split('data: ')[1].split('\n')[0]
  return JSON.parse(data)
}

describe('Stream', () => {
  it('handle stream', async () => {
    const expected = ['a', 'b', 'c']

    const app = new Spiceflow().get('/', async function* () {
      yield 'a'
      await sleep(10)

      yield 'b'
      await sleep(10)

      yield 'c'
    })

    const response = await app
      .handle(req('/'))
      .then((x) => x.body)
      .then((x) => {
        if (!x) return

        const reader = x?.getReader()

        let acc = ''
        const { promise, resolve } = Promise.withResolvers()

        reader.read().then(function pump({ done, value }): unknown {
          if (done) return resolve(acc)

          expect(parseTextEventStreamItem(value.toString())).toBe(
            expected.shift()!,
          )

          acc += value.toString()
          return reader.read().then(pump)
        })

        return promise
      })

    expect(expected).toHaveLength(0)
    expect(response).toBe(textEventStream(['a', 'b', 'c']))
  })
  it('handle errors after yield', async () => {
    const app = new Spiceflow().get('/', async function* () {
      yield 'a'
      await sleep(10)

      throw new Error('an error')
    })

    const response = await app.handle(req('/')).then((x) => x.text())

    expect(response).toMatchInlineSnapshot(
      `
      "event: message
      data: "a"

      event: error
      data: {"message":"an error"}

      "
    `,
    )
  })

  it('handle errors before yield when aot is false', async () => {
    const app = new Spiceflow()
      .onError(({ error }) => {
        return new Response(error.message)
      })
      .get('/', async function* () {
        throw new Error('an error xxxx')
      })

    const response = await app.handle(req('/')).then((x) => x.text())

    expect(response).toContain('an error')
  })

  it.todo('handle errors before yield when aot is true', async () => {
    const app = new Spiceflow()
      .onError(({ error }) => {
        return new Response(error.message)
      })
      .get('/', async function* () {
        throw new Error('an error')
      })

    const response = await app.handle(req('/')).then((x) => x.text())

    expect(response).toContain('an error')
  })

  it.todo('handle errors before yield with onError', async () => {
    const expected = 'error expected'
    const app = new Spiceflow()
      .onError(({}) => {
        return new Response(expected)
      })
      .get('/', async function* () {
        throw new Error('an error')
      })

    const response = await app.handle(req('/')).then((x) => x.text())

    expect(response).toBe(expected)
  })

  it('stop stream on canceled request', async () => {
    const expected = ['a', 'b']

    const app = new Spiceflow().get('/', async function* () {
      yield 'a'
      await sleep(10)

      yield 'b'
      await sleep(10)

      yield 'c'
    })

    const controller = new AbortController()

    setTimeout(() => {
      controller.abort()
    }, 15)

    const response = await app
      .handle(
        new Request('http://e.ly', {
          signal: controller.signal,
        }),
      )
      .then((x) => x.body)
      .then((x) => {
        if (!x) return

        const reader = x?.getReader()

        let acc = ''
        const { promise, resolve } = Promise.withResolvers()

        reader.read().then(function pump({ done, value }): unknown {
          if (done) {
            return resolve(acc)
          }

          expect(parseTextEventStreamItem(value.toString())).toBe(
            expected.shift()!,
          )

          acc += value.toString()
          return reader.read().then(pump)
        })

        return promise
      })

    expect(expected).toHaveLength(0)
    expect(response).toBe(textEventStream(['a', 'b']))
  })

  // it('mutate set before yield is called', async () => {
  // 	const expected = ['a', 'b', 'c']

  // 	const app = new Spiceflow().get('/', function* () {
  // 		set.headers['access-control-allow-origin'] = 'http://saltyaom.com'

  // 		yield 'a'
  // 		yield 'b'
  // 		yield 'c'
  // 	})

  // 	const response = await app.handle(req('/')).then((x) => x.headers)

  // 	expect(response.get('access-control-allow-origin')).toBe(
  // 		'http://saltyaom.com'
  // 	)
  // })
  it('handle stream with objects', async () => {
    const objects = [
      { message: 'hello' },
      { response: 'world' },
      { data: [1, 2, 3] },
      { result: [4, 5, 6] },
    ]
    const app = new Spiceflow().get('/', async function* ({}) {
      for (const obj of objects) {
        yield obj
      }
    })

    const body = await app.handle(req('/')).then((x) => x.body)

    let events = [] as any[]
    const parser = createParser({
      onEvent: (event) => {
        events.push(event)
      },
    })
    const { promise, resolve } = Promise.withResolvers<void>()
    const reader = body?.getReader()!

    reader.read().then(function pump({ done, value }): unknown {
      if (done) {
        return resolve()
      }
      const text = value.toString()
      parser.feed(text)
      return reader.read().then(pump)
    })
    await promise

    expect(events.map((x) => x.data)).toEqual(
      objects.map((x) => JSON.stringify(x)),
    )
  })

  // it('mutate set before yield is called', async () => {
  // 	const expected = ['a', 'b', 'c']

  // 	const app = new Spiceflow().get('/', function* () {
  // 		set.headers['access-control-allow-origin'] = 'http://saltyaom.com'

  // 		yield 'a'
  // 		yield 'b'
  // 		yield 'c'
  // 	})

  // 	const response = await app.handle(req('/')).then((x) => x.headers)

  // 	expect(response.get('access-control-allow-origin')).toBe(
  // 		'http://saltyaom.com'
  // 	)
  // })

  // it('async mutate set before yield is called', async () => {
  // 	const expected = ['a', 'b', 'c']

  // 	const app = new Spiceflow().get('/', async function* () {
  // 		set.headers['access-control-allow-origin'] = 'http://saltyaom.com'

  // 		yield 'a'
  // 		yield 'b'
  // 		yield 'c'
  // 	})

  // 	const response = await app.handle(req('/')).then((x) => x.headers)

  // 	expect(response.get('access-control-allow-origin')).toBe(
  // 		'http://saltyaom.com'
  // 	)
  // })

  it('return value if not yield', async () => {
    const app = new Spiceflow()
      .get('/', function* () {
        return 'hello'
      })
      .get('/json', function* () {
        return { hello: 'world' }
      })

    const response = await Promise.all([
      app.handle(req('/')),
      app.handle(req('/json')),
    ])

    const text = await response[0].text()
    expect(text).toMatchInlineSnapshot(`
      "event: message
      data: "hello"

      event: done

      "
    `)
    expect(parseTextEventStreamItem(text)).toMatchInlineSnapshot(`"hello"`)
  })

  it('return async value if not yield', async () => {
    const app = new Spiceflow()
      .get('/', function* () {
        return 'hello'
      })
      .get('/json', function* () {
        return { hello: 'world' }
      })

    const response = await Promise.all([
      app.handle(req('/')),
      app.handle(req('/json')),
    ])

    const text = await response[0].text()
    expect(text).toMatchInlineSnapshot(`
      "event: message
      data: "hello"

      event: done

      "
    `)
    expect(parseTextEventStreamItem(text)).toMatchInlineSnapshot(`"hello"`)
    
  })

  it('handle object and array', async () => {
    const expected = [{ a: 'b' }, ['a'], ['a', 1, { a: 'b' }]]
    const expectedResponse = JSON.stringify([...expected])
    let i = 0

    const app = new Spiceflow().get('/', async function* () {
      yield expected[0]
      await sleep(10)

      yield expected[1]
      await sleep(10)

      yield expected[2]
    })

    const response = await app
      .handle(req('/'))
      .then((x) => x.body)
      .then((x) => {
        if (!x) return

        const reader = x?.getReader()

        const { promise, resolve } = Promise.withResolvers<void>()

        reader.read().then(function pump({ done, value }): unknown {
          if (done) return resolve()

          expect(parseTextEventStreamItem(value.toString())).toEqual(
            expected[i++],
          )

          return reader.read().then(pump)
        })

        return promise
      })
  })
})
