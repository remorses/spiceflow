"poor man's use server";

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
  "pathname": "/api/actions-node",
  "isGenerator": false
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
export const failingFunction = _createRpcMethod(async function failingFunction({}: z.infer<typeof User>) {
  // throw new Error('This function fails');
}, {
  "name": "failingFunction",
  "pathname": "/api/actions-node",
  "isGenerator": false
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export default _createRpcHandler({
  isEdge: false,
  methods: [{
    method: "createUser",
    implementation: createUser,
    isGenerator: false
  }, {
    method: "failingFunction",
    implementation: failingFunction,
    isGenerator: false
  }]
});