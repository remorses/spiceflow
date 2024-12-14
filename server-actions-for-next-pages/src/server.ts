import { NextApiHandler } from 'next';
import { JsonRpcResponse } from './jsonRpc';
import { NextRequest, NextResponse } from 'next/server';
import { getEdgeContext } from './context-internal';
// @ts-ignore
import type SuperJSON from 'superjson';

export type Method<P extends any[], R> = (...params: P) => Promise<R>;
export type WrapMethodMeta = {
  name: string;
  pathname: string;
};

export interface WrapMethod {
  <P extends any[], R = any>(
    method: Method<P, R>,
    meta: WrapMethodMeta,
  ): Method<P, R>;
}

// TODO wrap with context here? otherwise the headers and cookies will be missing from the context
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
  return async (...args) => wrapped(...args);
}

let superjson: SuperJSON;

function serializeStreamMessage(json: any, meta: any) {
  return `data: ${JSON.stringify({ result: json, meta })}\n\n`;
}

export function createRpcHandler(
  methodsInit: [string, (...params: any[]) => Promise<any>][],
  isEdge?: boolean,
) {
  const methods = new Map(methodsInit);
  const handler = async ({ method, body }) => {
    if (!superjson) {
      superjson = (await import('superjson').then(
        (x) => x.default || x,
      )) as SuperJSON;
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
    const requestedFn = methods.get(fn);

    if (typeof requestedFn !== 'function') {
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
      const result = await requestedFn(...args);

      // Check if result is an async iterable
      if (result && typeof result[Symbol.asyncIterator] === 'function') {
        return {
          isStream: true,
          generator: result,
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          },
        };
      }

      const { json, meta } = superjson.serialize(result);
      return {
        json: {
          jsonrpc: '2.0',
          id,
          result: json as any,
          meta,
        } satisfies JsonRpcResponse,
      };
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
  if (isEdge) {
    return async (req: NextRequest) => {
      const { res } = await getEdgeContext();
      const body = await req.json();

      const result = await handler({
        body,
        method: req.method,
      });

      if ('isStream' in result) {
        const response = new Response(
          new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                for await (const chunk of result.generator) {
                  const { json, meta } = superjson.serialize(chunk);
                  controller.enqueue(
                    encoder.encode(serializeStreamMessage(json, meta)),
                  );
                }
                controller.close();
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                controller.enqueue(
                  encoder.encode(`event: error\ndata: ${errorMessage}\n\n`),
                );
                controller.close();
              }
            },
          }),
          {
            headers: {
              ...result.headers,
              ...(res?.headers || {}),
              'content-encoding': 'none',
              'content-type': 'text/event-stream',
            } as any,
          },
        );
        return response;
      }

      const { status, json } = result;
      return new Response(JSON.stringify(json, null, 2), {
        status,
        headers: res?.headers || {},
      });
    };
  } else {
    return (async (req, res) => {
      const body = req.body;
      const result = await handler({
        body,
        method: req.method,
      });

      if ('isStream' in result) {
        let generatorFinished = false;
        res.on('close', () => {
          if (generatorFinished) return;
          console.log(`response closed, cancelling generator`);
          (result.generator as AsyncIterator<any>).return?.();
        });

        res.writeHead(200, {
          ...result.headers,
          'cache-control': 'no-cache',
          connection: 'keep-alive',
          // https://github.com/vercel/next.js/issues/9965#issuecomment-584319868

          'content-encoding': 'none',
          'content-type': 'text/event-stream',
        });
        try {
          for await (const chunk of result.generator) {
            const { json, meta } = superjson.serialize(chunk);
            res.write(serializeStreamMessage(json, meta));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          res.write(`event: error\ndata: ${errorMessage}\n\n`);
        }
        generatorFinished = true;
        res.end();
        return;
      }

      const { status, json } = result;
      res.status(status || 200).json(json);
    }) satisfies NextApiHandler;
  }
}
