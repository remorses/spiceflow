/// <reference lib="dom" />
import type { AnySpiceflow, Spiceflow } from '../spiceflow.ts'

import { SpiceflowFetchError } from './errors.ts'

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type IsNever<T> = [T] extends [never] ? true : false

type Files = File | FileList

type ReplaceBlobWithFiles<in out RecordType extends Record<string, unknown>> = {
  [K in keyof RecordType]: RecordType[K] extends any
    ? RecordType[K]
    : RecordType[K] extends
          | Blob
          | Blob[]
          | { arrayBuffer: () => Promise<ArrayBuffer> }
      ? Files
      : RecordType[K]
} & {}

type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false

type ReplaceGeneratorWithAsyncGenerator<
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
  interface ClientParam {
    fetch?: RequestInit
  }

  export type Create<App extends AnySpiceflow> = App extends {
    _types: { ClientRoutes: infer Schema extends Record<string, any> }
  }
    ? Prettify<Sign<Schema>>
    : 'Install latest Spiceflow before using the client, make sure both client and server use the same version. Make sure you passed the App type generic if using createSpiceflowClient'

  export type Sign<in out Route extends Record<string, any>> = {
    [K in keyof Route as K extends `:${string}` ? never : K]: Route[K] extends {
      request: infer Body
      // headers: infer Headers
      params: any
      query: infer Query
      response: infer Response extends Record<number, unknown>
    }
      ? { headers?: Record<string, unknown> } & (undefined extends Query
          ? { query?: Record<string, unknown> }
          : { query: Query }) extends infer Param
        ? {} extends Param
          ? undefined extends Body
            ? K extends 'get' | 'head'
              ? (
                  options?: Prettify<Param & ClientParam>,
                ) => Promise<
                  ClientResponse<ReplaceGeneratorWithAsyncGenerator<Response>>
                >
              : (
                  request?: Body,
                  options?: Prettify<Param & ClientParam>,
                ) => Promise<
                  ClientResponse<ReplaceGeneratorWithAsyncGenerator<Response>>
                >
            : (
                request: Body extends Record<string, unknown>
                  ? ReplaceBlobWithFiles<Body>
                  : Body,
                options?: Prettify<Param & ClientParam>,
              ) => Promise<
                ClientResponse<ReplaceGeneratorWithAsyncGenerator<Response>>
              >
          : K extends 'get' | 'head'
            ? (
                options: Prettify<Param & ClientParam>,
              ) => Promise<
                ClientResponse<ReplaceGeneratorWithAsyncGenerator<Response>>
              >
            : (
                request: Body extends Record<string, unknown>
                  ? ReplaceBlobWithFiles<Body>
                  : Body,
                options: Prettify<Param & ClientParam>,
              ) => Promise<
                ClientResponse<ReplaceGeneratorWithAsyncGenerator<Response>>
              >
        : never
      : CreateParams<Route[K]>
  }

  type CreateParams<Route extends Record<string, any>> =
    Extract<keyof Route, `:${string}`> extends infer Path extends string
      ? IsNever<Path> extends true
        ? Prettify<Sign<Route>>
        : // ! DO NOT USE PRETTIFY ON THIS LINE, OTHERWISE FUNCTION CALLING WILL BE OMITTED
          (((params: {
            [param in Path extends `:${infer Param}`
              ? Param extends `${infer Param}?`
                ? Param
                : Param
              : never]: string | number
          }) => Prettify<Sign<Route[Path]>> & CreateParams<Route[Path]>) &
            Prettify<Sign<Route>>) &
            (Path extends `:${string}?` ? CreateParams<Route[Path]> : {})
      : never

  export interface Config {
    // fetch?: Omit<RequestInit, 'headers' | 'method'>
    fetch?: typeof fetch
    headers?: MaybeArray<
      | RequestInit['headers']
      | ((path: string, options: RequestInit) => RequestInit['headers'] | void)
    >
    onRequest?: MaybeArray<
      (path: string, options: RequestInit) => MaybePromise<RequestInit | void>
    >
    onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>
    retries?: number

    // keepDomain?: boolean
  }

  // type UnwrapAwaited<T extends Record<number, unknown>> = {
  //     [K in keyof T]: Awaited<T[K]>
  // }

  export type ClientResponse<Res extends Record<number, unknown>> =
    | {
        data: Res[200]
        error: null
        response: Response
        status: number
        headers: RequestInit['headers']
        url: string
      }
    | {
        data: null
        error: Exclude<keyof Res, 200> extends never
          ? SpiceflowFetchError<number, any>
          : {
              [Status in keyof Res]: SpiceflowFetchError<Status, Res[Status]>
            }[Exclude<keyof Res, 200>]
        response: Response
        status: number
        headers: RequestInit['headers']
        url: string
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

export type Not<T> = T extends true ? false : true
