import { NextApiHandler, NextApiResponse } from 'next';

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

function sendError(res: NextApiResponse, status: number, message: string) {
  res.status(status).json({ error: { message } });
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
      sendError(res, 405, `method "${req.method}" is not allowed`);
      return;
    }

    const { method, params } = req.body;
    const requestedFn = methods.get(method);

    if (typeof requestedFn !== 'function') {
      sendError(res, 400, `"${method}" is not a function`);
      return;
    }

    try {
      const result = await requestedFn(...params);
      return res.json({ result });
    } catch (error) {
      const {
        name = 'NextRpcError',
        message = `Invalid value thrown in "${method}", must be instance of Error`,
        stack = undefined,
      } = error instanceof Error ? error : {};
      return res.status(502).json({
        error: {
          name,
          message,
          stack: process.env.NODE_ENV === 'production' ? undefined : stack,
        },
      });
    }
  };
}
