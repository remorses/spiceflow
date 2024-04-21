"poor man's use server";

import { wrapApiHandler as _wrapApiHandler } from "server-actions-for-next-pages/dist/context-internal";
import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server.js";
import { getNodejsContext } from 'server-actions-for-next-pages/context';
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
  "name": "createUser",
  "pathname": "/api/actions-node"
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

/**
 * @public
 */
export const failingFunction = _createRpcMethod(async function failingFunction({}) {
  throw new Error('This function fails');
}, {
  "name": "failingFunction",
  "pathname": "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export default /*#__PURE__*/_wrapApiHandler(_createRpcHandler({
  isEdge: false,
  isGenerator: false,
  methods: [{
    method: "createUser",
    implementation: createUser
  }, {
    method: "failingFunction",
    implementation: failingFunction
  }]
}), false);