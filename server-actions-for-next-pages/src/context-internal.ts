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
  cookies(): ReadonlyRequestCookies;
  headers(): ReadonlyHeaders;
}
interface NodejsContext extends CommonContext {
  req?: IncomingMessage;
  res?: ServerResponse;
}
interface EdgeContext extends CommonContext {
  req?: NextRequest;
  res?: NextResponse;
}

const DEFAULT_CONTEXT = {
  headers() {
    return headers()
    throw new Error('Cannot call headers() outside of a request');
    return new HeadersAdapter({});
  },
  cookies() {
    return cookies()
    throw new Error('Cannot call cookies() outside of a request');
    return RequestCookiesAdapter.seal(
      new RequestCookies(new HeadersAdapter({})),
    );
  },
};

const asyncLocalStorage = new AsyncLocalStorage<NodejsContext | EdgeContext>();

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
      const res = NextResponse.json(null);
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

export type GetInitialProps<IP> = (
  context: NextPageContext,
) => IP | Promise<IP>;

/**
 * @deprecated
 */
export function wrapGetInitialProps<IP>(
  getInitialProps: GetInitialProps<IP>,
): GetInitialProps<IP> {
  return (context) =>
    asyncLocalStorage.run(context as any, () => getInitialProps(context));
}

export function wrapPage<P, IP>(Page: NextPage<P, IP>): NextPage<P, IP> {
  if (typeof Page.getInitialProps === 'function') {
    Page.getInitialProps = wrapGetInitialProps(Page.getInitialProps);
  }
  return new Proxy(Page, {
    set(target, property, value) {
      if (property === 'getInitialProps' && typeof value === 'function') {
        return Reflect.set(target, property, wrapGetInitialProps(value));
      }
      return Reflect.set(target, property, value);
    },
  });
}
