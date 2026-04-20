// Tests for the vendored Flight data encoder/decoder.
import { test, expect } from 'vitest'
import { flightEncode, flightDecode } from './flight-data.ts'

function roundTrip(value: unknown) {
  const encoded = flightEncode(value)
  return flightDecode(encoded)
}

test('primitive types', () => {
  expect(roundTrip(null)).toBe(null)
  expect(roundTrip(undefined)).toBe(undefined)
  expect(roundTrip(true)).toBe(true)
  expect(roundTrip(false)).toBe(false)
  expect(roundTrip(42)).toBe(42)
  expect(roundTrip(0)).toBe(0)
  expect(roundTrip(-1)).toBe(-1)
  expect(roundTrip(3.14)).toBe(3.14)
  expect(roundTrip('hello')).toBe('hello')
  expect(roundTrip('')).toBe('')
})

test('special number values', () => {
  expect(Number.isNaN(roundTrip(NaN) as number)).toBe(true)
  expect(roundTrip(Infinity)).toBe(Infinity)
  expect(roundTrip(-Infinity)).toBe(-Infinity)
  expect(Object.is(roundTrip(-0), -0)).toBe(true)
})

test('strings starting with $ or @ are escaped', () => {
  expect(roundTrip('$hello')).toBe('$hello')
  expect(roundTrip('$$double')).toBe('$$double')
  expect(roundTrip('@at')).toBe('@at')
  expect(roundTrip('@@double')).toBe('@@double')
})

test('Date', () => {
  const d = new Date('2025-01-20T18:01:57.852Z')
  const result = roundTrip(d) as Date
  expect(result).toBeInstanceOf(Date)
  expect(result.toISOString()).toBe('2025-01-20T18:01:57.852Z')
})

test('Map', () => {
  const m = new Map<string, number>([
    ['a', 1],
    ['b', 2],
  ])
  const result = roundTrip(m) as Map<string, number>
  expect(result).toBeInstanceOf(Map)
  expect(result.get('a')).toBe(1)
  expect(result.get('b')).toBe(2)
  expect(result.size).toBe(2)
})

test('Set', () => {
  const s = new Set([1, 2, 3])
  const result = roundTrip(s) as Set<number>
  expect(result).toBeInstanceOf(Set)
  expect(result.has(1)).toBe(true)
  expect(result.has(2)).toBe(true)
  expect(result.has(3)).toBe(true)
  expect(result.size).toBe(3)
})

test('BigInt', () => {
  const result = roundTrip(BigInt(123456789))
  expect(result).toBe(BigInt(123456789))
  expect(typeof result).toBe('bigint')
})

test('RegExp', () => {
  const result = roundTrip(/foo.*bar/gi) as RegExp
  expect(result).toBeInstanceOf(RegExp)
  expect(result.source).toBe('foo.*bar')
  expect(result.flags).toBe('gi')
})

test('Symbol.for', () => {
  const result = roundTrip(Symbol.for('test'))
  expect(result).toBe(Symbol.for('test'))
})

test('local Symbol becomes undefined', () => {
  const result = roundTrip(Symbol('local'))
  expect(result).toBe(undefined)
})

test('complex nested object', () => {
  const data = {
    date: new Date('2025-01-20T18:01:57.852Z'),
    map: new Map([
      ['a', 1],
      ['b', 2],
    ]),
    set: new Set([1, 2, 3]),
    bigint: BigInt(123),
    nested: { hello: 'world' },
    arr: [1, 'two', true, null],
    undef: undefined,
  }
  const result = roundTrip(data) as typeof data
  expect(result.date).toBeInstanceOf(Date)
  expect(result.date.toISOString()).toBe('2025-01-20T18:01:57.852Z')
  expect(result.map).toBeInstanceOf(Map)
  expect(result.map.get('a')).toBe(1)
  expect(result.set).toBeInstanceOf(Set)
  expect(result.set.has(2)).toBe(true)
  expect(result.bigint).toBe(BigInt(123))
  expect(result.nested).toEqual({ hello: 'world' })
  expect(result.arr).toEqual([1, 'two', true, null])
  expect(result.undef).toBe(undefined)
})

test('Error serialization', () => {
  const err = new Error('test error')
  err.name = 'CustomError'
  const result = roundTrip(err) as Error
  expect(result).toBeInstanceOf(Error)
  expect(result.message).toBe('test error')
  expect(result.name).toBe('CustomError')
})

test('URL', () => {
  const url = new URL('https://example.com/path?q=1')
  const result = roundTrip(url) as URL
  expect(result).toBeInstanceOf(URL)
  expect(result.href).toBe('https://example.com/path?q=1')
})

test('wire format matches React Flight protocol', () => {
  const data = { date: new Date('2025-01-20T18:01:57.852Z'), bigint: BigInt(42) }
  const encoded = flightEncode(data)
  expect(encoded).toMatchInlineSnapshot(`
    "0:{"date":"$D2025-01-20T18:01:57.852Z","bigint":"$n42"}
    "
  `)
})

test('wire format for Map/Set uses separate chunks', () => {
  const data = { map: new Map([['a', 1]]), set: new Set([1, 2]) }
  const encoded = flightEncode(data)
  expect(encoded).toMatchInlineSnapshot(`
    "1:[["a",1]]
    2:[1,2]
    0:{"map":"$Q1","set":"$W2"}
    "
  `)
})

test('empty object', () => {
  expect(roundTrip({})).toEqual({})
})

test('empty array', () => {
  expect(roundTrip([])).toEqual([])
})

test('nested arrays and objects', () => {
  const data = { a: [{ b: [1, 2, { c: 3 }] }] }
  expect(roundTrip(data)).toEqual(data)
})
