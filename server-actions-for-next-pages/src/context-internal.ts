import { AsyncLocalStorage } from 'async_hooks';
import type {
  NextApiHandler,
  GetServerSideProps,
  NextPageContext,
  NextPage,
} from 'next';
import type { IncomingMessage, ServerResponse } from 'http';
import { NextRequest, NextResponse } from 'next/server';
import {
  ReadonlyRequestCookies,
  RequestCookiesAdapter,
} from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import {
  ReadonlyHeaders,
  HeadersAdapter,
} from 'next/dist/server/web/spec-extension/adapters/headers';
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies, headers } from 'next/headers';

interface CommonContext {
  /**
   * @deprecated
   */
  cookies(): ReadonlyRequestCookies;
  /**
   * @deprecated
   */
  headers(): ReadonlyHeaders;
}
interface NodejsContext extends CommonContext {
  req?: IncomingMessage;
  res?: ServerResponse;
}
interface EdgeContext extends CommonContext {
  req?: Request;
  res?: Response;
}

const DEFAULT_CONTEXT = {
  headers() {
    return headers();
  },
  cookies() {
    return cookies();
  },
};

export const asyncLocalStorage = new AsyncLocalStorage<
  NodejsContext | EdgeContext
>();

export function getNodejsContext(): NodejsContext {
  return (asyncLocalStorage.getStore() as NodejsContext) || DEFAULT_CONTEXT;
}

export function getEdgeContext(): EdgeContext {
  return (asyncLocalStorage.getStore() as EdgeContext) || DEFAULT_CONTEXT;
}

export function getContext(): CommonContext {
  return asyncLocalStorage.getStore() || DEFAULT_CONTEXT;
}

export function wrapApiHandler(handler: Function, isEdge) {
  if (isEdge) {
    return async (req) => {
      const res = new Response('');
      const context = {
        req,
        res,
        cookies() {
          return new RequestCookies(req.headers);
        },
        headers() {
          return req.headers as ReadonlyHeaders;
        },
      };
      return asyncLocalStorage.run(context as any, () => handler(req));
    };
  }
  return (req, res) => {
    const asyncCtx: NodejsContext = {
      req,
      res,
      cookies() {
        return new RequestCookies(new HeadersAdapter(req.headers)) as any;
      },
      headers() {
        return new HeadersAdapter(req.headers);
      },
    };
    return asyncLocalStorage.run(asyncCtx, () => handler(req, res));
  };
}

export function wrapGetServerSideProps(
  getServerSideProps: GetServerSideProps,
): GetServerSideProps {
  return (c) => {
    const { req, res } = c;
    const asyncCtx: NodejsContext = {
      req,
      res,
      cookies() {
        return new RequestCookies(new HeadersAdapter(req.headers)) as any;
      },
      headers() {
        return new HeadersAdapter(req.headers);
      },
    };
    return asyncLocalStorage.run(asyncCtx, () => getServerSideProps(c));
  };
}
