/// <reference lib="dom" />

export type IsNever<T> = [T] extends [never] ? true : false
type Not<T> = T extends true ? false : true

type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false

export type ReplaceGeneratorWithAsyncGenerator<
  in out RecordType extends Record<string, unknown>,
> = {
  [K in keyof RecordType]: RecordType[K] extends any
    ? RecordType[K]
    : RecordType[K] extends Generator<infer A, infer B, infer C>
      ? And<Not<IsNever<A>>, void extends B ? true : false> extends true
        ? AsyncGenerator<A, B, C>
        : And<IsNever<A>, void extends B ? false : true> extends true
          ? B
          : AsyncGenerator<A, B, C> | B
      : RecordType[K] extends AsyncGenerator<infer A, infer B, infer C>
        ? And<Not<IsNever<A>>, void extends B ? true : false> extends true
          ? AsyncGenerator<A, B, C>
          : And<IsNever<A>, void extends B ? false : true> extends true
            ? B
            : AsyncGenerator<A, B, C> | B
        : RecordType[K]
} & {}

type MaybeArray<T> = T | T[]
type MaybePromise<T> = T | Promise<T>

export namespace SpiceflowClient {
  export interface Config {
    fetch?: typeof fetch
    state?: Record<string, any>
    headers?: MaybeArray<
      | RequestInit['headers']
      | ((path: string, options: RequestInit) => RequestInit['headers'] | void)
    >
    onRequest?: MaybeArray<
      (path: string, options: RequestInit) => MaybePromise<RequestInit | void>
    >
    onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>
    retries?: number
  }

  export interface OnMessage<Data = unknown> extends MessageEvent {
    data: Data
    rawData: MessageEvent['data']
  }

  export type WSEvent<
    K extends keyof WebSocketEventMap,
    Data = unknown,
  > = K extends 'message' ? OnMessage<Data> : WebSocketEventMap[K]
}
