'poor man user server';

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-pages/dist/server";
export const config = {
  runtime: 'edge'
};
export const serverAction = _createRpcMethod(async function serverAction({}) {
  return 'Hello from server action';
}, {
  name: "serverAction",
  pathname: "/api/actions-edge"
}, null);
export default /*#__PURE__*/_createRpcHandler([["serverAction", serverAction]], true);