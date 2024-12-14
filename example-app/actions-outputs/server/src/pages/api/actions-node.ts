"poor man's use server";

import { wrapApiHandler as _wrapApiHandler } from "server-actions-for-next-pages/dist/context-internal";
import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { getContext, getNodejsContext } from 'server-actions-for-next-pages/context';
export const createUser = _createRpcMethod(async function createUser({
  name = ''
}) {
  const {
    req,
    res
  } = await getNodejsContext();
  await sleep(1000);
  // console.log('node cookies & headers', headers());
  const url = req?.url;
  // revalidatePath('/');
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
export const generateNumbers = _createRpcMethod(async function* generateNumbers() {
  const {
    request
  } = getContext();
  console.log('request', request?.url);
  let count = 0;
  while (count < 10) {
    await sleep(1000); // Using the existing sleep function
    yield {
      count
    };
    count++;
  }
}, {
  name: "generateNumbers",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const failingFunction = _createRpcMethod(async function failingFunction({}) {
  throw new Error('This function fails');
}, {
  name: "failingFunction",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export default /*#__PURE__*/_wrapApiHandler( /*#__PURE__*/_createRpcHandler([["createUser", createUser], ["generateNumbers", generateNumbers], ["failingFunction", failingFunction]], false), false);