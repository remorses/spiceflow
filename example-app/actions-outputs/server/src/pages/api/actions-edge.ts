"poor man's use server";

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server.js";
import { sleep } from '@/utils';
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

// async generator
export const asyncGeneratorActionEdge = _createRpcMethod(async function* asyncGeneratorActionEdge(arg?: any) {
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield {
      i
    };
  }
}, {
  "name": "asyncGeneratorActionEdge",
  "pathname": "/api/actions-edge",
  "isGenerator": true
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const edgeServerAction = _createRpcMethod(async function edgeServerAction({}) {
  const {
    req,
    res,
    headers,
    cookies
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
  "pathname": "/api/actions-edge",
  "isGenerator": false
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export default _createRpcHandler({
  isEdge: true,
  methods: [{
    method: "asyncGeneratorActionEdge",
    implementation: asyncGeneratorActionEdge,
    isGenerator: true
  }, {
    method: "edgeServerAction",
    implementation: edgeServerAction,
    isGenerator: false
  }]
});