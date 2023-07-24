import { NextApiHandler } from 'next';
import { JsonRpcResponse } from './jsonRpc';

export type Method<P extends any[], R> = (...params: P) => Promise<R>;
export type WrapMethodMeta = {
  name: string;
  pathname: string;
};

export interface WrapMethod {
  <P extends any[], R = any>(
    method: Method<P, R>,
    meta: WrapMethodMeta
  ): Method<P, R>;
}

export function createRpcMethod<P extends any[], R>(
  method: Method<P, R>,
  meta: WrapMethodMeta,
  customWrapRpcMethod: unknown
): Method<P, R> {
  let wrapped = method;
  if (typeof customWrapRpcMethod === 'function') {
    wrapped = customWrapRpcMethod(method, meta);
    if (typeof wrapped !== 'function') {
      throw new Error(
        `wrapMethod didn't return a function, got "${typeof wrapped}"`
      );
    }
  } else if (
    customWrapRpcMethod !== undefined &&
    customWrapRpcMethod !== null
  ) {
    throw new Error(
      `Invalid wrapMethod type, expected "function", got "${typeof customWrapRpcMethod}"`
    );
  }
  return async (...args) => wrapped(...args);
}

export function createRpcHandler(
  methodsInit: [string, (...params: any[]) => Promise<any>][]
): NextApiHandler {
  const methods = new Map(methodsInit);
  return async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405);
      res.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Server error',
          data: {
            cause: `HTTP method "${req.method}" is not allowed`,
          },
        },
      } satisfies JsonRpcResponse);
      return;
    }

    const { id, method, params } = req.body;
    const requestedFn = methods.get(method);

    if (typeof requestedFn !== 'function') {
      res.status(400);
      res.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: 'Method not found',
          data: {
            cause: `Method "${method}" is not a function`,
          },
        },
      } satisfies JsonRpcResponse);
      return;
    }

    try {
      const result = await requestedFn(...params);
      return res.json({
        jsonrpc: '2.0',
        id,
        result,
      } satisfies JsonRpcResponse);
    } catch (error) {
      const {
        name = 'NextRpcError',
        message = `Invalid value thrown in "${method}", must be instance of Error`,
        stack = undefined,
      } = error instanceof Error ? error : {};
      return res.json({
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
      } satisfies JsonRpcResponse);
    }
  };
}
