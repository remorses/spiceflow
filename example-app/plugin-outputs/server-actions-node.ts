'poor man user server';

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { getNodejsContext } from 'server-actions-for-next-pages/context';
export const createUser = _createRpcMethod(async function createUser({
  name = ''
}) {
  const {
    req,
    res
  } = await getNodejsContext();
  const url = req?.url;
  return {
    name,
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
      console.error(error);
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
export default /*#__PURE__*/_createRpcHandler([["createUser", createUser], ["failingFunction", failingFunction]], false);