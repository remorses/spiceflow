import { AsyncLocalStorage } from 'async_hooks';
import type {
  NextApiHandler,
  GetServerSideProps,
  NextPageContext,
  NextPage,
} from 'next';
import type { IncomingMessage, ServerResponse } from 'http';
import { NextRequest, NextResponse } from 'next/server';

interface NodejsContext {
  req?: IncomingMessage;
  res?: ServerResponse;
}
interface EdgeContext {
  req?: NextRequest;
  res?: NextResponse;
}

const DEFAULT_CONTEXT = {};

const asyncLocalStorage = new AsyncLocalStorage<NodejsContext | EdgeContext>();

export function getNodejsContext(): NodejsContext {
  return asyncLocalStorage.getStore() || DEFAULT_CONTEXT;
}
export function getEdgeContext(): EdgeContext {
  return asyncLocalStorage.getStore() || DEFAULT_CONTEXT;
}

export function wrapApiHandler(handler: Function, isEdge) {
  if (isEdge) {
    return async (req) => {
      const res = NextResponse.json(null);
      const context = { req, res };
      return asyncLocalStorage.run(context, () => handler(req));
    };
  }
  return (req, res) => {
    const context = { req, res };
    return asyncLocalStorage.run(context, () => handler(req, res));
  };
}

export function wrapGetServerSideProps(
  getServerSideProps: GetServerSideProps,
): GetServerSideProps {
  return (context) =>
    asyncLocalStorage.run(context, () => getServerSideProps(context));
}

export type GetInitialProps<IP> = (
  context: NextPageContext,
) => IP | Promise<IP>;

export function wrapGetInitialProps<IP>(
  getInitialProps: GetInitialProps<IP>,
): GetInitialProps<IP> {
  return (context) =>
    asyncLocalStorage.run(context, () => getInitialProps(context));
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
