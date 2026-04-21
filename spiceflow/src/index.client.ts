// Client-safe subset of the spiceflow main export.
// Keep exports synced with index.ts — every export there must appear here,
// either as a real re-export (client-safe) or a stub that throws at runtime (server-only).

// All types re-exported from index.ts are safe to use in client code.
export type * from './index.js'

// Client-safe runtime re-exports
export { parseFormData, parseFormDataAsync } from './parse-form-data.js'
export { ValidationError, json } from './error.js'
export { redirect } from './react/errors.js'
export { withSpan, noopSpan, noopTracer } from './instrumentation.js'

class Response extends globalThis.Response {}
export { Response }

// Server-only stubs. These exist so client code that accidentally references
// a server API gets a clear error at runtime instead of a bundler crash.

function serverOnly(name: string): never {
  throw new Error(
    `"${name}" is server-only and cannot be used in client code. ` +
      `Import it from 'spiceflow' only in server files, or use a 'use server' module.`,
  )
}

export class SpiceflowRequest extends globalThis.Request {}
export const Spiceflow: any = new Proxy(function () {}, {
  construct() {
    serverOnly('Spiceflow')
  },
  apply() {
    serverOnly('Spiceflow')
  },
})
export function createHref(..._: any[]): any {
  serverOnly('createHref')
}
export function serveStatic(..._: any[]): any {
  serverOnly('serveStatic')
}
export function getActionRequest(..._: any[]): any {
  serverOnly('getActionRequest')
}
export function preventProcessExitIfBusy(..._: any[]): any {
  serverOnly('preventProcessExitIfBusy')
}
export function getDeploymentId(..._: any[]): any {
  serverOnly('getDeploymentId')
}
export const publicDir = ''
export const distDir = ''
