import { IncomingMessage, ServerResponse } from 'http';
import superjson from 'superjson';
import { asyncLocalStorage } from './context-internal';
import { JsonRpcRequest, JsonRpcResponse } from './jsonRpc';
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
  [key: string]: () => Promise<{
    [key: string]: Method<any, any>;
  }>;
};

export function internalEdgeHandler({
  methodsMap,
}: {
  methodsMap: MethodsMap;
}) {
  return async ({ req, basePath }: { req: Request; basePath: string }) => {
    const body = await req.json();
    const res = new Response();
    const result = await asyncLocalStorage.run({ req, res }, () =>
      handler({
        methodsMap,
        body,
        pathname: new URL(req.url).pathname,
        basePath,
        method: req.method,
      }),
    );

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
                encoder.encode('data: ' + JSON.stringify(value.json) + '\n\n'),
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
  return async ({
    req,
    res,
    basePath,
  }: {
    req: IncomingMessage;
    res: ServerResponse;
    basePath: string;
  }) => {
    let body = req['body'];
    if (body && typeof body === 'string') {
      // if the sdk send a request without content-type header as json, it will be a string
      body = JSON.parse(body);
    }
    if (!body) {
      // if used outside of next.js, the body is not available
      try {
        body = await readReqJson(req);
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

    const result = await asyncLocalStorage.run({ req, res }, () =>
      handler({
        methodsMap,
        body,
        basePath,
        pathname: req.url!,
        method: req.method!,
      }),
    );

    if (isAsyncIterable(result)) {
      res.writeHead(200);
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
    res.writeHead(status || 200).end(JSON.stringify(json, null, 2));
  };
}

function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
  return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
}

const handler = async ({
  method,
  methodsMap,
  basePath,
  body,
  pathname,
}: {
  method: string;
  basePath: string;
  pathname: string;
  methodsMap: MethodsMap;
  body: JsonRpcRequest;
}) => {
  if (!methodsMap) {
    throw new Error('No methods found');
  }
  if (basePath && pathname.startsWith(basePath)) {
    if (basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }
    pathname = pathname.slice(basePath.length);
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

  const mod = methodsMap[pathname] && (await methodsMap[pathname]());
  if (!mod) {
    return {
      status: 400,
      json: {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: 'Method not found',
          data: {
            cause: `Path "${pathname}" is not handled by any method`,
          },
        },
      } satisfies JsonRpcResponse,
    };
  }

  const requestedMethod = mod[fn];

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
              mod,
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

function readReqJson(req: IncomingMessage) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
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
