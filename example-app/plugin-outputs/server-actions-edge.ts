"poor man's use server";

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { getContext, getEdgeContext } from 'server-actions-for-next-pages/context';
import { wrapMethod } from './actions-node';
export const runtime = 'edge';
// export const config = { runtime: 'edge' };

export { wrapMethod };
export const edgeServerAction = _createRpcMethod(async function edgeServerAction({}) {
  const {
    req,
    res
  } = await getEdgeContext();
  const {
    cookies,
    headers
  } = getContext();
  console.log('edge cookies & headers', cookies(), headers());
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;
  return {
    url
  };
}, {
  name: "edgeServerAction",
  pathname: "/api/actions-edge"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export default /*#__PURE__*/_createRpcHandler([["edgeServerAction", edgeServerAction]], true);