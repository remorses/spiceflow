"poor man's use server";

import { wrapApiHandler as _wrapApiHandler } from "server-actions-for-next-pages/dist/context-internal";
import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server.js";
import { getEdgeContext } from 'server-actions-for-next-pages/context';
import { cookies, headers } from 'server-actions-for-next-pages/headers';
export const runtime = 'edge';
// export const config = { runtime: 'edge' };

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
export const edgeServerAction = _createRpcMethod(async function edgeServerAction({}) {
  const {
    req,
    res
  } = await getEdgeContext();

  // console.log('edge cookies & headers', cookies(), headers());
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;
  return {
    url,
    cookies: cookies().toString().slice(0, 20),
    headers: Array.from(headers().keys()).slice(0, 2),
    functionName: 'edgeServerAction'
  };
}, {
  "name": "edgeServerAction",
  "pathname": "/api/actions-edge"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export default /*#__PURE__*/_wrapApiHandler(_createRpcHandler({
  isEdge: true,
  isGenerator: false,
  methods: [{
    method: "edgeServerAction",
    implementation: edgeServerAction
  }]
}), true);