// Regression tests for Node request abort wiring in nodeToWebRequest.
import { EventEmitter } from 'node:events'
import { expect, test } from 'vitest'
import { nodeToWebRequest, shouldIgnoreRequestError } from './_node-server.js'

function createFakeReqRes() {
  const req = new EventEmitter() as EventEmitter & {
    url: string
    method: string
    headers: Record<string, string>
    rawHeaders: string[]
  }
  req.url = '/'
  req.method = 'GET'
  req.headers = { host: 'localhost' }
  req.rawHeaders = ['host', 'localhost']

  const res = new EventEmitter() as EventEmitter & {
    writableFinished: boolean
  }
  res.writableFinished = false

  return { req, res }
}

test('nodeToWebRequest aborts signal on request error', () => {
  const { req, res } = createFakeReqRes()
  const request = nodeToWebRequest(req as any, res as any)

  expect(request.signal.aborted).toBe(false)
  req.emit('error', new Error('socket error'))
  expect(request.signal.aborted).toBe(true)
})

test('nodeToWebRequest aborts signal when response closes before finishing', () => {
  const { req, res } = createFakeReqRes()
  const request = nodeToWebRequest(req as any, res as any)

  expect(request.signal.aborted).toBe(false)
  res.writableFinished = false
  res.emit('close')
  expect(request.signal.aborted).toBe(true)
})

test('nodeToWebRequest does not abort signal when response closes after finishing', () => {
  const { req, res } = createFakeReqRes()
  const request = nodeToWebRequest(req as any, res as any)

  expect(request.signal.aborted).toBe(false)
  res.writableFinished = true
  res.emit('close')
  expect(request.signal.aborted).toBe(false)
})

// Regression: new URL('//evil.com/x', base) replaced the host, which bypassed
// the server action origin check.
test('nodeToWebRequest keeps the Host header for protocol-relative paths', () => {
  const { req, res } = createFakeReqRes()
  req.url = '//evil.com/x?a=1'
  expect(nodeToWebRequest(req as any, res as any).url).toBe(
    'http://localhost//evil.com/x?a=1',
  )
})

test('nodeToWebRequest ignores a path smuggled in the Host header', () => {
  const { req, res } = createFakeReqRes()
  req.url = '/public'
  req.headers.host = 'victim.com/admin?'
  expect(nodeToWebRequest(req as any, res as any).url).toBe(
    'http://victim.com/public',
  )
})

test('shouldIgnoreRequestError suppresses abort errors', () => {
  expect(shouldIgnoreRequestError(new DOMException('aborted', 'AbortError'))).toBe(
    true,
  )
})

test('shouldIgnoreRequestError suppresses expected stream close errors', () => {
  expect(
    shouldIgnoreRequestError({ code: 'ERR_STREAM_PREMATURE_CLOSE' }),
  ).toBe(true)
  expect(shouldIgnoreRequestError({ code: 'ERR_STREAM_UNABLE_TO_PIPE' })).toBe(
    true,
  )
})

test('shouldIgnoreRequestError keeps unexpected errors visible', () => {
  expect(shouldIgnoreRequestError(new Error('boom'))).toBe(false)
})
