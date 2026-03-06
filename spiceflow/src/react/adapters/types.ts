// Bundler adapter interfaces for multi-bundler RSC support.
// Each bundler (Vite, Parcel, etc.) implements these interfaces via
// virtual:bundler-adapter/* modules resolved at build time.
import type { ReactFormState } from 'react-dom/client'

export interface RscServerAdapter {
  renderToReadableStream: (
    model: unknown,
    options?: {
      temporaryReferences?: unknown
      onPostpone?: (reason: string) => void
      onError?: (error: unknown) => string | void
      signal?: AbortSignal
    },
  ) => ReadableStream
  createTemporaryReferenceSet: () => unknown
  decodeReply: (
    body: string | FormData,
    options?: { temporaryReferences?: unknown },
  ) => Promise<unknown[]>
  decodeAction: (formData: FormData) => Promise<() => Promise<unknown>>
  decodeFormState: (
    result: unknown,
    formData: FormData,
  ) => Promise<ReactFormState | undefined>
  loadServerAction: (id: string) => Promise<(...args: unknown[]) => unknown>
  getAppEntryCssElement: () => React.ReactNode
}

export interface RscSsrAdapter {
  createFromReadableStream: <T>(stream: ReadableStream) => Promise<T>
  loadBootstrapScriptContent: () => Promise<string>
  importRscEnvironment: () => Promise<{
    handler: (request: Request) => Promise<Response>
    app: any
  }>
}

export interface RscClientAdapter {
  createFromReadableStream: <T>(stream: ReadableStream) => Promise<T>
  createFromFetch: <T>(
    response: Promise<Response>,
    opts?: { temporaryReferences?: unknown },
  ) => Promise<T>
  createTemporaryReferenceSet: () => unknown
  encodeReply: (
    args: unknown[],
    opts?: { temporaryReferences?: unknown },
  ) => Promise<unknown>
  setServerCallback: (
    cb: (id: string, args: unknown[]) => Promise<unknown>,
  ) => void
  onHmrUpdate: (callback: () => void) => void
  onHmrError: () => void
}
