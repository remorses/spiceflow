import { AsyncLocalStorage } from 'async_hooks';
import * as http from 'http';
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
  request?: Request;
}
interface NodejsContext extends CommonContext {
  req?: IncomingMessage;
  res?: ServerResponse;
  request?: Request;
}
interface EdgeContext extends CommonContext {
  req?: NextRequest;
  res?: NextResponse;
  request?: Request;
}

const DEFAULT_CONTEXT: any = {
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

/**
 * @deprecated Use headers() and cookies() instead, exported from next-actions-for-next-pages/headers
 */
export function getNodejsContext(): NodejsContext {
  return (asyncLocalStorage.getStore() as NodejsContext) || DEFAULT_CONTEXT;
}
/**
 * @deprecated Use headers() and cookies() instead, exported from next-actions-for-next-pages/headers
 */
export function getEdgeContext(): EdgeContext {
  return (asyncLocalStorage.getStore() as EdgeContext) || DEFAULT_CONTEXT;
}

/**
 * @deprecated Use headers() and cookies() instead, exported from next-actions-for-next-pages/headers
 */
export function getContext(): CommonContext {
  return asyncLocalStorage.getStore() || DEFAULT_CONTEXT;
}

export function getRequestAbortSignal(): AbortSignal | undefined {
  const context = asyncLocalStorage.getStore();
  return context?.request?.signal;
}
function createHeaders(req: http.IncomingMessage): Headers {
  let headers = new Headers();

  let rawHeaders = req.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    headers.append(rawHeaders[i], rawHeaders[i + 1]);
  }

  return headers;
}

function createRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Request {
  let controller = new AbortController();
  res.on('close', () => {
    controller.abort();
  });

  let method = req.method ?? 'GET';
  let headers = createHeaders(req);

  let protocol =
    'encrypted' in req.socket && req.socket.encrypted ? 'https:' : 'http:';
  let host = headers.get('Host') ?? 'localhost';
  let url = new URL(req.url!, `${protocol}//${host}`);

  let init: RequestInit = { method, headers, signal: controller.signal };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = new ReadableStream({
      start(controller) {
        req.on('data', (chunk) => {
          controller.enqueue(
            new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
          );
        });
        req.on('end', () => {
          controller.close();
        });
      },
    });

    // init.duplex = 'half' must be set when body is a ReadableStream, and Node follows the spec.
    // However, this property is not defined in the TypeScript types for RequestInit, so we have
    // to cast it here in order to set it without a type error.
    // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex
    (init as { duplex: 'half' }).duplex = 'half';
  }

  return new Request(url, init);
}

export function wrapApiHandler(handler: Function, isEdge) {
  if (isEdge) {
    return async (req) => {
      const res = new Response('');
      const context = {
        request: new Request(req.url, req),
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
      request: createRequest(req, res),
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
