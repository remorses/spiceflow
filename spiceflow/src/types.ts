// https://github.com/remorses/elysia/blob/main/src/types.ts#L6

import z from 'zod'

import type {
  OptionalKind,
  Static,
  StaticDecode,
  TObject,
  TSchema,
} from '@sinclair/typebox'

import type { OpenAPIV3 } from 'openapi-types'

import { ZodObject, ZodTypeAny } from 'zod'
import type { Context, ErrorContext, MiddlewareContext } from './context.js'
import {
  SPICEFLOW_RESPONSE,
  InternalServerError,
  ParseError,
  ValidationError,
} from './error.js'
import { Spiceflow } from './spiceflow.js'

export type MaybeArray<T> = T | T[]
export type MaybePromise<T> = T | Promise<T>
export type MaybePromiseIterable<T> = T | Promise<T> | AsyncIterable<T>

export type ObjectValues<T extends object> = T[keyof T]

type IsPathParameter<Part extends string> = Part extends `:${infer Parameter}`
  ? Parameter
  : Part extends `*`
  ? '*'
  : never

export type GetPathParameter<Path extends string> =
  Path extends `${infer A}/${infer B}`
    ? IsPathParameter<A> | GetPathParameter<B>
    : IsPathParameter<Path>

export type ResolvePath<Path extends string> = Prettify<
  {
    [Param in GetPathParameter<Path> as Param extends `${string}?`
      ? never
      : Param]: string
  } & {
    [Param in GetPathParameter<Path> as Param extends `${infer OptionalParam}?`
      ? OptionalParam
      : never]?: string
  }
>

// https://twitter.com/mattpocockuk/status/1622730173446557697?s=20
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Prettify2<T> = {
  [K in keyof T]: Prettify<T[K]>
} & {}

export type Partial2<T> = {
  [K in keyof T]?: Partial<T[K]>
}

export type NeverKey<T> = {
  [K in keyof T]?: T[K]
} & {}

type IsBothObject<A, B> = A extends Record<string | number | symbol, unknown>
  ? B extends Record<string | number | symbol, unknown>
    ? IsClass<A> extends false
      ? IsClass<B> extends false
        ? true
        : false
      : false
    : false
  : false

type IsClass<V> = V extends abstract new (...args: any) => any ? true : false

export type Reconcile<
  A extends Object,
  B extends Object,
  Override extends boolean = false,
  // Detect Stack limit, eg. circular dependency
  Stack extends number[] = [],
> = Stack['length'] extends 16
  ? A
  : Override extends true
  ? {
      [key in keyof A as key extends keyof B ? never : key]: A[key]
    } extends infer Collision
    ? {} extends Collision
      ? {
          [key in keyof B]: IsBothObject<
            // @ts-ignore trust me bro
            A[key],
            B[key]
          > extends true
            ? Reconcile<
                // @ts-ignore trust me bro
                A[key],
                B[key],
                Override,
                [0, ...Stack]
              >
            : B[key]
        }
      : Prettify<
          Collision & {
            [key in keyof B]: B[key]
          }
        >
    : never
  : {
      [key in keyof B as key extends keyof A ? never : key]: B[key]
    } extends infer Collision
  ? {} extends Collision
    ? {
        [key in keyof A]: IsBothObject<
          A[key],
          // @ts-ignore trust me bro
          B[key]
        > extends true
          ? Reconcile<
              // @ts-ignore trust me bro
              A[key],
              // @ts-ignore trust me bro
              B[key],
              Override,
              [0, ...Stack]
            >
          : A[key]
      }
    : Prettify<
        {
          [key in keyof A]: A[key]
        } & Collision
      >
  : never

export interface SingletonBase {
  state: Record<string, unknown>
}

export interface DefinitionBase {
  type: Record<string, unknown>
  error: Record<string, Error>
}

export type RouteBase = Record<string, unknown>

export interface MetadataBase {
  schema: RouteSchema
  macro: BaseMacro
  macroFn: BaseMacroFn
}

export interface RouteSchema {
  body?: unknown
  query?: unknown
  params?: unknown
  response?: unknown
}

type OptionalField = {
  [OptionalKind]: 'Optional'
}

export type TypeSchema = TSchema | ZodTypeAny

export type TypeObject = TObject | ZodObject<any, any, any>

export type UnwrapSchema<
  Schema extends TypeSchema | string | undefined,
  Definitions extends Record<string, unknown> = {},
> = undefined extends Schema
  ? unknown
  : Schema extends ZodTypeAny
  ? z.infer<Schema>
  : Schema extends TSchema
  ? Schema extends OptionalField
    ? Prettify<Partial<Static<Schema>>>
    : StaticDecode<Schema>
  : Schema extends string
  ? Definitions extends Record<Schema, infer NamedSchema>
    ? NamedSchema
    : Definitions
  : unknown

export interface UnwrapRoute<
  in out Schema extends InputSchema<any>,
  in out Definitions extends DefinitionBase['type'] = {},
> {
  body: UnwrapSchema<Schema['body'], Definitions>
  query: UnwrapSchema<Schema['query'], Definitions>
  params: UnwrapSchema<Schema['params'], Definitions>
  response: Schema['response'] extends TypeSchema | string
    ? {
        200: UnwrapSchema<Schema['response'], Definitions>
      }
    : Schema['response'] extends Record<number, TypeSchema | string>
    ? {
        [k in keyof Schema['response']]: UnwrapSchema<
          Schema['response'][k],
          Definitions
        >
      }
    : unknown | void
}

export type LifeCycleEvent =
  | 'start'
  | 'request'
  | 'parse'
  | 'transform'
  | 'beforeHandle'
  | 'afterHandle'
  | 'response'
  | 'error'
  | 'stop'

export type ContentType = MaybeArray<
  | (string & {})
  // | 'none'
  // | 'text'
  // | 'json'
  // | 'formdata'
  // | 'urlencoded'
  // | 'arrayBuffer'
  | 'text/plain'
  | 'application/json'
  | 'multipart/form-data'
  | 'application/x-www-form-urlencoded'
>

export type HTTPMethod =
  | (string & {})
  | 'ACL'
  | 'BIND'
  | 'CHECKOUT'
  | 'CONNECT'
  | 'COPY'
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'LINK'
  | 'LOCK'
  | 'M-SEARCH'
  | 'MERGE'
  | 'MKACTIVITY'
  | 'MKCALENDAR'
  | 'MKCOL'
  | 'MOVE'
  | 'NOTIFY'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PROPFIND'
  | 'PROPPATCH'
  | 'PURGE'
  | 'PUT'
  | 'REBIND'
  | 'REPORT'
  | 'SEARCH'
  | 'SOURCE'
  | 'SUBSCRIBE'
  | 'TRACE'
  | 'UNBIND'
  | 'UNLINK'
  | 'UNLOCK'
  | 'UNSUBSCRIBE'
  | 'ALL'

export interface InputSchema<Name extends string = string> {
  body?: TypeSchema | Name
  query?: TypeObject | Name
  params?: TypeObject | Name
  response?:
    | TypeSchema
    | Record<number, TypeSchema>
    | Name
    | Record<number, Name | TypeSchema>
}

export interface MergeSchema<
  in out A extends RouteSchema,
  in out B extends RouteSchema,
> {
  body: undefined extends A['body'] ? B['body'] : A['body']
  query: undefined extends A['query'] ? B['query'] : A['query']
  params: undefined extends A['params'] ? B['params'] : A['params']
  response: {} extends A['response']
    ? {} extends B['response']
      ? {}
      : B['response']
    : {} extends B['response']
    ? A['response']
    : A['response'] & Omit<B['response'], keyof A['response']>
}

export type Handler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
  Path extends string = '',
> = (
  context: Context<Route, Singleton, Path>,
) => MaybePromise<
  {} extends Route['response']
    ? unknown
    : Route['response'][keyof Route['response']]
>

export type Replace<Original, Target, With> = IsAny<Target> extends true
  ? Original
  : Original extends Record<string, unknown>
  ? {
      [K in keyof Original]: Original[K] extends Target ? With : Original[K]
    }
  : Original extends Target
  ? With
  : Original

export type IsAny<T> = 0 extends 1 & T ? true : false

export type CoExist<Original, Target, With> = IsAny<Target> extends true
  ? Original
  : Original extends Record<string, unknown>
  ? {
      [K in keyof Original]: Original[K] extends Target
        ? Original[K] | With
        : Original[K]
    }
  : Original extends Target
  ? Original | With
  : Original

export type InlineHandler<
  Route extends RouteSchema = {},
  Singleton extends SingletonBase = {
    state: {}
  },
  Path extends string = '',
  MacroContext = {},
> = (
  context: MacroContext extends Record<string | number | symbol, unknown>
    ? Prettify<MacroContext & Context<Route, Singleton, Path>>
    : Context<Route, Singleton, Path>,
) =>
  | Response
  | MaybePromiseIterable<
      {} extends Route['response']
        ? unknown
        :
            | (Route['response'] extends { 200: any }
                ? Route['response']
                : string | number | boolean | Object)
            | Route['response'][keyof Route['response']]
            | {
                [Status in keyof Route['response']]: {
                  _type: Record<Status, Route['response'][Status]>
                  [SPICEFLOW_RESPONSE]: Status
                }
              }[keyof Route['response']]
    >

export type OptionalHandler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
  Path extends string = '',
> = Handler<Route, Singleton, Path> extends (
  context: infer Context,
) => infer Returned
  ? (context: Context) => Returned | MaybePromise<void>
  : never

export type AfterHandler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
  Path extends string = '',
> = Handler<Route, Singleton, Path> extends (
  context: infer Context,
) => infer Returned
  ? (
      context: Prettify<
        {
          response: Route['response']
        } & Context
      >,
    ) => Returned | MaybePromise<void>
  : never

export type MapResponse<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
  Path extends string = '',
> = Handler<
  Omit<Route, 'response'> & {
    response: MaybePromise<Response | undefined | unknown>
  },
  Singleton & {
    derive: {
      response: Route['response']
    }
  },
  Path
>

export type VoidHandler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
> = (context: Context<Route, Singleton>) => MaybePromise<void>

export type TransformHandler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
  BasePath extends string = '',
> = {
  (
    context: Prettify<
      Context<
        Route,
        Omit<Singleton, 'resolve'> & {
          resolve: {}
        },
        BasePath
      >
    >,
  ): MaybePromise<void>
}

export type BodyHandler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
  Path extends string = '',
> = (
  context: Prettify<
    {
      contentType: string
    } & Context<Route, Singleton, Path>
  >,

  contentType: string,
) => MaybePromise<any>

export type MiddlewareHandler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = any,
> = (
  context: MiddlewareContext<Singleton>,
  next: () => Promise<Response>,
) => MaybePromise<Route['response'] | void>

export type AfterResponseHandler<
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
> = (
  context: Prettify<
    Context<Route, Singleton> & {
      response: Route['response']
    }
  >,
) => MaybePromise<void>

// export type GracefulHandler<
// 	in Instance extends AnySpiceflow,
// > = (data: Instance) => any

export type ErrorHandler<
  in out T extends Record<string, Error> = {},
  in out Route extends RouteSchema = {},
  in out Singleton extends SingletonBase = {
    state: {}
  },
> = (
  context: ErrorContext<
    Route,
    {
      state: Singleton['state']
    }
  > &
    (
      | Prettify<
          {
            request: Request
            code: 'UNKNOWN'
            error: Readonly<Error>
          } & Partial<Singleton['state']>
        >
      | Prettify<
          {
            request: Request
            code: 'VALIDATION'
            error: Readonly<ValidationError>
          } & Singleton['state']
        >
      // | Prettify<
      // 		{
      // 			request: Request
      // 			code: 'NOT_FOUND'
      // 			error: Readonly<NotFoundError>
      // 		} & NeverKey<Singleton['state']>
      //   >
      | Prettify<
          {
            request: Request
            code: 'PARSE'
            error: Readonly<ParseError>
          } & Singleton['state']
        >
      | Prettify<
          {
            request: Request
            code: 'INTERNAL_SERVER_ERROR'
            error: Readonly<InternalServerError>
          } & Partial<Singleton['state']>
        >
      | Prettify<
          {
            [K in keyof T]: {
              request: Request
              code: K
              error: Readonly<T[K]>
            }
          }[keyof T] &
            Partial<Singleton['state']>
        >
    ),
) => any | Promise<any>

export type Isolate<T> = {
  [P in keyof T]: T[P]
}

export type DocumentDecoration = Partial<OpenAPIV3.OperationObject> & {
  /**
   * Pass `true` to hide route from OpenAPI/swagger document
   * */
  hide?: boolean
  // 'x-fern-type-name'?: string
  'x-fern-sdk-group-name'?: string | string[]
  'x-fern-sdk-method-name'?: string
  'x-fern-webhook'?: boolean
}

export type LocalHook<
  LocalSchema extends InputSchema,
  Schema extends RouteSchema,
  Singleton extends SingletonBase,
  Errors extends Record<string, Error>,
  Extension extends BaseMacro,
  Path extends string = '',
  TypedRoute extends RouteSchema = Schema extends {
    params: Record<string, unknown>
  }
    ? Schema
    : Schema & {
        params: undefined extends Schema['params']
          ? ResolvePath<Path>
          : Schema['params']
      },
> = (LocalSchema extends {} ? LocalSchema : Isolate<LocalSchema>) &
  Extension & {
    detail?: DocumentDecoration
    bodyType?: ContentType
    type?: ContentType
  }

export type ComposedHandler = (context: Context) => MaybePromise<Response>

export interface InternalRoute {
  method: HTTPMethod
  path: string
  composed: ComposedHandler | Response | null
  handler: Handler
  hooks: LocalHook<any, any, any, any, any, any, any>
}

export type AddPrefix<Prefix extends string, T> = {
  [K in keyof T as Prefix extends string ? `${Prefix}${K & string}` : K]: T[K]
}

export type AddPrefixCapitalize<Prefix extends string, T> = {
  [K in keyof T as `${Prefix}${Capitalize<K & string>}`]: T[K]
}

export type AddSuffix<Suffix extends string, T> = {
  [K in keyof T as `${K & string}${Suffix}`]: T[K]
}

export type AddSuffixCapitalize<Suffix extends string, T> = {
  [K in keyof T as `${K & string}${Capitalize<Suffix>}`]: T[K]
}

export type BaseMacro = Record<
  string,
  string | number | boolean | Object | undefined | null
>
export type BaseMacroFn = Record<string, (...a: any) => unknown>

type _CreateClient<
  Path extends string,
  Property extends Record<string, unknown> = {},
> = Path extends `${infer Start}/${infer Rest}`
  ? {
      [x in Start]: _CreateClient<Rest, Property>
    }
  : {
      [x in Path]: Property
    }

export type CreateClient<
  Path extends string,
  Property extends Record<string, unknown> = {},
> = Path extends `/${infer Rest}`
  ? _CreateClient<Rest, Property>
  : Path extends ''
  ? _CreateClient<'index', Property>
  : _CreateClient<Path, Property>

export type ComposeSpiceflowResponse<Response, Handle> = Handle extends (
  ...a: any[]
) => infer A
  ? _ComposeSpiceflowResponse<Response, Awaited<A>>
  : _ComposeSpiceflowResponse<Response, Awaited<Handle>>

type _ComposeSpiceflowResponse<Response, Handle> = Prettify<
  {} extends Response
    ? {
        200: Exclude<Handle, { [SPICEFLOW_RESPONSE]: any }>
      } & {
        [ErrorResponse in Extract<
          Handle,
          { response: any }
        > as ErrorResponse extends {
          [SPICEFLOW_RESPONSE]: infer Status extends number
        }
          ? Status
          : never]: ErrorResponse['response']
      }
    : Response
>

export type MergeSpiceflowInstances<
  Instances extends Spiceflow<any, any, any, any, any, any>[] = [],
  Prefix extends string = '',
  Scoped extends boolean = false,
  Singleton extends SingletonBase = {
    state: {}
  },
  Definitions extends DefinitionBase = {
    type: {}
    error: {}
  },
  Metadata extends MetadataBase = {
    schema: {}
    macro: {}
    macroFn: {}
  },
  Routes extends RouteBase = {},
> = Instances extends [
  infer Current extends Spiceflow<any, any, any, any, any, any>,
  ...infer Rest extends Spiceflow<any, any, any, any, any, any>[],
]
  ? Current['_types']['Scoped'] extends true
    ? MergeSpiceflowInstances<
        Rest,
        Prefix,
        Scoped,
        Singleton,
        Definitions,
        Metadata,
        Routes
      >
    : MergeSpiceflowInstances<
        Rest,
        Prefix,
        Scoped,
        Singleton & Current['_types']['Singleton'],
        Definitions & Current['_types']['Definitions'],
        Metadata & Current['_types']['Metadata'],
        Routes &
          (Prefix extends ``
            ? Current['_routes']
            : AddPrefix<Prefix, Current['_routes']>)
      >
  : Spiceflow<
      Prefix,
      Scoped,
      {
        state: Prettify<Singleton['state']>
      },
      {
        type: Prettify<Definitions['type']>
        error: Prettify<Definitions['error']>
      },
      {
        schema: Prettify<Metadata['schema']>
        macro: Prettify<Metadata['macro']>
        macroFn: Prettify<Metadata['macroFn']>
      },
      Routes
    >

export type LifeCycleType = 'global' | 'local' | 'scoped'

export type UnionToIntersect<U> = (
  U extends unknown ? (arg: U) => 0 : never
) extends (arg: infer I) => 0
  ? I
  : never

export type ContextAppendType = 'append' | 'override'

export type HTTPHeaders = Record<string, string> & {
  // Authentication
  'www-authenticate'?: string
  authorization?: string
  'proxy-authenticate'?: string
  'proxy-authorization'?: string

  // Caching
  age?: string
  'cache-control'?: string
  'clear-site-data'?: string
  expires?: string
  'no-vary-search'?: string
  pragma?: string

  // Conditionals
  'last-modified'?: string
  etag?: string
  'if-match'?: string
  'if-none-match'?: string
  'if-modified-since'?: string
  'if-unmodified-since'?: string
  vary?: string

  // Connection management
  connection?: string
  'keep-alive'?: string

  // Content negotiation
  accept?: string
  'accept-encoding'?: string
  'accept-language'?: string

  // Controls
  expect?: string
  'max-forwards'?: string

  // Cokies
  cookie?: string
  'set-cookie'?: string | string[]

  // CORS
  'access-control-allow-origin'?: string
  'access-control-allow-credentials'?: string
  'access-control-allow-headers'?: string
  'access-control-allow-methods'?: string
  'access-control-expose-headers'?: string
  'access-control-max-age'?: string
  'access-control-request-headers'?: string
  'access-control-request-method'?: string
  origin?: string
  'timing-allow-origin'?: string

  // Downloads
  'content-disposition'?: string

  // Message body information
  'content-length'?: string
  'content-type'?: string
  'content-encoding'?: string
  'content-language'?: string
  'content-location'?: string

  // Proxies
  forwarded?: string
  via?: string

  // Redirects
  location?: string
  refresh?: string

  // Request context
  // from?: string
  // host?: string
  // referer?: string
  // 'user-agent'?: string

  // Response context
  allow?: string
  server?: 'spiceflow' | (string & {})

  // Range requests
  'accept-ranges'?: string
  range?: string
  'if-range'?: string
  'content-range'?: string

  // Security
  'content-security-policy'?: string
  'content-security-policy-report-only'?: string
  'cross-origin-embedder-policy'?: string
  'cross-origin-opener-policy'?: string
  'cross-origin-resource-policy'?: string
  'expect-ct'?: string
  'permission-policy'?: string
  'strict-transport-security'?: string
  'upgrade-insecure-requests'?: string
  'x-content-type-options'?: string
  'x-frame-options'?: string
  'x-xss-protection'?: string

  // Server-sent events
  'last-event-id'?: string
  'ping-from'?: string
  'ping-to'?: string
  'report-to'?: string

  // Transfer coding
  te?: string
  trailer?: string
  'transfer-encoding'?: string

  // Other
  'alt-svg'?: string
  'alt-used'?: string
  date?: string
  dnt?: string
  'early-data'?: string
  'large-allocation'?: string
  link?: string
  'retry-after'?: string
  'service-worker-allowed'?: string
  'source-map'?: string
  upgrade?: string

  // Non-standard
  'x-dns-prefetch-control'?: string
  'x-forwarded-for'?: string
  'x-forwarded-host'?: string
  'x-forwarded-proto'?: string
  'x-powered-by'?: 'spiceflow' | (string & {})
  'x-request-id'?: string
  'x-requested-with'?: string
  'x-robots-tag'?: string
  'x-ua-compatible'?: string
}

export type JoinPath<A extends string, B extends string> = `${A}${B extends '/'
  ? '/index'
  : B extends ''
  ? B
  : B extends `/${string}`
  ? B
  : B}`

export type PartialWithRequired<T, K extends keyof T> = Partial<Omit<T, K>> &
  Pick<T, K>
