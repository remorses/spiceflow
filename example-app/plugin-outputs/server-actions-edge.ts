"poor man's use server";

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { getEdgeContext } from 'server-actions-for-next-pages/context';
export const config = {
  runtime: 'edge'
};
export const serverAction = _createRpcMethod(async function serverAction({}) {
  const {
    req,
    res
  } = await getEdgeContext();
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;
  return {
    url
  };
}, {
  name: "serverAction",
  pathname: "/api/actions-edge"
}, null);
export default /*#__PURE__*/_createRpcHandler([["serverAction", serverAction]], true);