"poor man's use server";

import { wrapApiHandler as _wrapApiHandler } from "server-actions-for-next-pages/dist/context-internal";
import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { getNodejsContext } from 'server-actions-for-next-pages/context';
import { getContext } from 'server-actions-for-next-pages/context';
export const createUser = _createRpcMethod(async function createUser({
  name = ''
}) {
  const {
    req,
    res
  } = await getNodejsContext();
  const {
    cookies,
    headers
  } = getContext();
  // console.log('node cookies & headers', headers());
  const url = req?.url;
  return {
    functionName: 'nodejs createUser',
    url
  };
}, {
  name: "createUser",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
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
export const failingFunction = _createRpcMethod(async function failingFunction({}) {
  throw new Error('This function fails');
}, {
  name: "failingFunction",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export default /*#__PURE__*/_wrapApiHandler( /*#__PURE__*/_createRpcHandler([["createUser", createUser], ["failingFunction", failingFunction]], false), false);