import { NextApiHandler } from 'next';
import superjson from 'superjson';
import { JsonRpcRequest, JsonRpcResponse } from './jsonRpc';
import { NextRequest, NextResponse } from 'next/server';
import { getEdgeContext } from './context-internal';

export type Method<P extends any[], R> = (
  ...params: P
) => Promise<R> | AsyncIterable<R>;
export type WrapMethodMeta = {
  name: string;
  isGenerator: boolean;
  pathname: string;
};

export interface WrapMethod {
  <P extends any[], R = any>(
    method: Method<P, R>,
    meta: WrapMethodMeta,
  ): Method<P, R>;
}

export function createRpcMethod<P extends any[], R>(
  method: Method<P, R>,
  meta: WrapMethodMeta,
  customWrapRpcMethod: unknown,
): Method<P, R> {
  let wrapped = method;
  if (typeof customWrapRpcMethod === 'function') {
    wrapped = customWrapRpcMethod(method, meta);
    if (typeof wrapped !== 'function') {
      throw new Error(
        `wrapMethod didn't return a function, got "${typeof wrapped}"`,
      );
    }
  } else if (
    customWrapRpcMethod !== undefined &&
    customWrapRpcMethod !== null
  ) {
    throw new Error(
      `Invalid wrapMethod type, expected "function", got "${typeof customWrapRpcMethod}"`,
    );
  }
  return (...args) => wrapped(...args);
}

type MethodMod = {
  method: string;
  implementation: (...params: any[]) => any;
};
export function createRpcHandler({
  methods,
  isEdge,
}: {
  methods: MethodMod[];
  isEdge?: boolean;
}) {
  const methodsMap = new Map(methods.map((x) => [x.method, x]));

  if (isEdge) {
    return async (req: NextRequest) => {
      const { res } = await getEdgeContext();
      const body = await req.json();

      const result = await handler({
        methodsMap,
        body,
        method: req.method,
      });

      if (isAsyncIterable(result)) {
        const encoder = new TextEncoder();
        req.signal.addEventListener('abort', () => {
          result.return?.(undefined);
        });
        const readableStream = new ReadableStream(
          {
            start(controller) {},
            async pull(controller) {
              for await (const value of result) {
                controller.enqueue(
                  encoder.encode(
                    'data: ' + JSON.stringify(value.json) + '\n\n',
                  ),
                );
              }
              controller.close();
            },

            cancel() {},
          },
          // { highWaterMark: 0 },
        );

        return new Response(readableStream, {
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          },
        });
      }

      const { status, json } = result;
      return new Response(JSON.stringify(json, null, 2), {
        status,
        headers: res?.headers || {},
      });
    };
  } else {
    return (async (req, res) => {
      let body = req.body;
      if (typeof body === 'string') {
        // if the sdk send a request without content-type header as json, it will be a string
        body = JSON.parse(body);
      }
      const result = await handler({
        methodsMap,
        body,
        method: req.method!,
      });

      if (isAsyncIterable(result)) {
        res.status(200);
        res.setHeader('content-type', 'text/event-stream');
        res.setHeader('cache-control', 'no-cache');
        res.setHeader('connection', 'keep-alive');
        // https://github.com/vercel/next.js/issues/9965#issuecomment-584319868
        res.setHeader('content-encoding', 'none');
        res.flushHeaders();
        // handle cancellation
        res.on('close', () => {
          console.log(`response closed, cancelling generator`);
          (result as AsyncIterator<any>).return?.();
        });
        for await (const value of result) {
          res.write('data: ' + JSON.stringify(value.json) + '\n\n');
        }

        res.end();
        return;
      }
      const { status, json } = result;
      res.status(status || 200).json(json);
    }) satisfies NextApiHandler;
  }
}

function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
  return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
}

const handler = async ({
  method,
  methodsMap,
  body,
}: {
  method: string;
  methodsMap: Map<string, MethodMod>;
  body: JsonRpcRequest;
}) => {
  if (method !== 'POST') {
    return {
      status: 405,
      json: {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Server error',
          data: {
            cause: `HTTP method "${method}" is not allowed`,
          },
        },
      } satisfies JsonRpcResponse,
    };
  }

  const { id, method: fn, params, meta: argsMeta } = body;
  const requestedMethod = methodsMap.get(fn);

  if (typeof requestedMethod?.implementation !== 'function') {
    return {
      status: 400,
      json: {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: 'Method not found',
          data: {
            cause: `Method "${method}" is not a function`,
          },
        },
      } satisfies JsonRpcResponse,
    };
  }

  try {
    const args = superjson.deserialize({
      json: params,
      meta: argsMeta,
    }) as any[];
    const result = await requestedMethod.implementation(...args);
    if (!isAsyncIterable(result)) {
      const { json, meta } = superjson.serialize(result);

      return {
        json: {
          jsonrpc: '2.0',
          id,
          result: json as any,
          meta,
        } satisfies JsonRpcResponse,
      };
    }
    return (async function* () {
      // send a response for each yielded value

      try {
        for await (const value of result) {
          const { json, meta } = superjson.serialize(value);

          yield {
            json: {
              jsonrpc: '2.0',
              id,
              result: json as any,
              meta,
            } satisfies JsonRpcResponse,
          };
        }
      } catch (error) {
        const {
          name = 'NextRpcError',
          message = `Invalid value thrown in "${method}", must be instance of Error`,
          stack = undefined,
        } = error instanceof Error ? error : {};
        return {
          json: {
            jsonrpc: '2.0',
            id,
            error: {
              code: 1,
              message,
              data: {
                name,
                ...(process.env.NODE_ENV === 'production' ? {} : { stack }),
              },
            },
          } satisfies JsonRpcResponse,
        };
      }
    })();
  } catch (error) {
    const {
      name = 'NextRpcError',
      message = `Invalid value thrown in "${method}", must be instance of Error`,
      stack = undefined,
    } = error instanceof Error ? error : {};
    return {
      status: 502,
      json: {
        jsonrpc: '2.0',
        id,
        error: {
          code: 1,
          message,
          data: {
            name,
            ...(process.env.NODE_ENV === 'production' ? {} : { stack }),
          },
        },
      } satisfies JsonRpcResponse,
    };
  }
};
