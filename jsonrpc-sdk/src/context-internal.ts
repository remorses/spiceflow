import { AsyncLocalStorage } from 'async_hooks';
import type { IncomingMessage, ServerResponse } from 'http';

interface CommonContext {
  // cookies(): ReadonlyRequestCookies;
  // headers(): ReadonlyHeaders;
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
  // headers() {},
  // cookies() {},
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
