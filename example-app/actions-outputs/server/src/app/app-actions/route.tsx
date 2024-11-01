"poor man's use server";

import { wrapGetServerSideProps as _wrapGetServerSideProps } from "server-actions-for-next-pages/dist/context-internal";
import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { cookies, headers } from 'server-actions-for-next-pages/headers';
export function wrapMethod(fn) {
  return async (...args) => {
    try {
      const res = await fn(...args);
      return res;
    } catch (error) {
      // console.error(error);
      throw error;
    }
  };
}
export const appServerAction = _createRpcMethod(async function appServerAction({}) {
  // console.log('edge cookies & headers', cookies(), headers());

  return {
    cookies: cookies().toString().slice(0, 20),
    headers: Array.from(headers().keys()).slice(0, 2),
    functionName: 'appRouteAction'
  };
}, {
  name: "appServerAction",
  pathname: "/app-actions"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const POST = /*#__PURE__*/_createRpcHandler([["appServerAction", appServerAction]], true);