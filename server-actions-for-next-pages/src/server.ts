import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { IncomingMessage, ServerResponse } from 'http';
import superjson from 'superjson';
import { JsonRpcRequest, JsonRpcResponse } from './jsonRpc';
import { NextRequest, NextResponse } from 'next/server';
import { asyncLocalStorage, getEdgeContext } from './context-internal';
import { jsonRpcError } from './utils';

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

export function createRpcHandler({
  methods,
  isEdge,
}: {
  methods: {
    method: string;
    isGenerator: boolean;
    implementation: (...params: any[]) => any;
  }[];

  isEdge?: boolean;
}) {
  const methodsMap: MethodsMap = Object.fromEntries(
    methods.map(({ method, implementation, isGenerator }) => [
      method,
      implementation,
    ]),
  );

  const handler = isEdge
    ? internalEdgeHandler({ methodsMap })
    : internalNodeJsHandler({ methodsMap });
  return handler;
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

type MethodsMap = {
  [key: string]: Method<any, any>;
};

export function internalEdgeHandler({
  methodsMap,
}: {
  methodsMap: MethodsMap;
}) {
  return async (req: NextRequest) => {
    const body = await req.json();
    const res = new Response();
    const result = await handler({
      methodsMap,
      body,

      method: req.method,
    });

    if (isAsyncGenerator(result)) {
      const encoder = new TextEncoder();
      let generatorFinished = false;

      req.signal.addEventListener('abort', () => {
        if (!generatorFinished) {
          console.log(`request aborted, cancelling generator`);
          result.return?.(undefined);
        }
      });
      const readableStream = new ReadableStream(
        {
          start(controller) {},
          async pull(controller) {
            while (true) {
              const { done, value } = await result.next();
              if (done) {
                break;
              }
              controller.enqueue(
                encoder.encode('data: ' + JSON.stringify(value.json) + '\n\n'),
              );
            }
            generatorFinished = true;
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
      headers: res?.headers || {
        'content-type': 'application/json',
      },
    });
  };
}

export function internalNodeJsHandler({
  methodsMap,
}: {
  methodsMap: MethodsMap;
}) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let body = req['body'];
    if (body && typeof body === 'string') {
      // if the sdk send a request without content-type header as json, it will be a string
      body = JSON.parse(body);
    }
    if (!body) {
      // if used outside of next.js, the body is not available
      try {
        body = await readReqJson(req, res);
      } catch (error) {
        res.writeHead(400);
        res.end(
          JSON.stringify(
            jsonRpcError({ message: 'Invalid body, must be JSON' }),
          ),
        );
        return;
      }
    }

    const result = await handler({
      methodsMap,
      body,

      method: req.method!,
    });

    if (isAsyncGenerator(result)) {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
        // https://github.com/vercel/next.js/issues/9965#issuecomment-584319868
        'content-encoding': 'none',
      });

      let generatorFinished = false;
      // handle cancellation
      res.on('close', () => {
        if (!generatorFinished) {
          console.log(`response closed, cancelling generator`);
          (result as AsyncIterator<any>).return?.();
        }
      });
      while (true) {
        const { done, value } = await result.next();
        if (done) {
          break;
        }
        res.write('data: ' + JSON.stringify(value.json) + '\n\n');
      }
      generatorFinished = true;

      res.end();
      return;
    }
    const { status, json } = result;
    res.writeHead(status || 200).end(JSON.stringify(json, null, 2));
  };
}

function isAsyncGenerator(obj: any): obj is AsyncGenerator<any> {
  return obj != null && typeof obj.next === 'function';
}

const handler = async ({
  method,
  methodsMap,

  body,
}: {
  method: string;

  methodsMap: MethodsMap;

  body: JsonRpcRequest;
}) => {
  if (!methodsMap) {
    throw new Error('No methods found');
  }

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

  const requestedMethod = methodsMap[fn];

  if (typeof requestedMethod !== 'function') {
    return {
      status: 400,
      json: {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: 'Method not found',
          data: {
            cause: `Method "${fn}" is not a function, in ${Object.keys(
              methodsMap,
            ).join(', ')}`,
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
    const result = await requestedMethod(...args);
    if (!isAsyncGenerator(result)) {
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
        while (true) {
          const { done, value } = await result.next();
          if (done) {
            break;
          }
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
          name = 'RpcError',
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
      name = 'RpcError',
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

function readReqJson(req: IncomingMessage, res: ServerResponse) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('error', (err) => {
      reject(err);
    });
    res.on('close', function () {
      let aborted = !res.writableFinished;
      if (aborted) {
        let err = new Error('Request aborted in server action handler');
        err.name = 'AbortError';
        reject(err);
      }
    });
    req.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    });
  });
}
