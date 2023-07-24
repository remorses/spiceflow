import { NextApiHandler } from 'next';
import { JsonRpcResponse } from './jsonRpc';
import { NextRequest, NextResponse } from 'next/server';
import { getEdgeContext } from './context-internal';

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

export function createRpcHandler(
  methodsInit: [string, (...params: any[]) => Promise<any>][],
  isEdge?: boolean,
) {
  const methods = new Map(methodsInit);
  const handler = async ({ method, body }) => {
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

    const { id, method: fn, params } = body;
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
      const result = await requestedFn(...params);
      return {
        json: {
          jsonrpc: '2.0',
          id,
          result,
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
      const { status, json } = await handler({
        body: await req.json(),
        method: req.method,
      });

      return NextResponse.json(json, { status, headers: res?.headers || {} });
    };
  } else {
    return (async (req, res) => {
      const { status, json } = await handler({
        body: req.body,
        method: req.method,
      });
      res.status(status || 200).json(json);
    }) satisfies NextApiHandler;
  }
}
