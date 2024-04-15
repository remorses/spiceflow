"poor man's use server";

import { wrapApiHandler as _wrapApiHandler } from "server-actions-for-next-pages/dist/context-internal";
import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { getContext, getEdgeContext } from 'server-actions-for-next-pages/context';
export const runtime = 'edge';
// export const config = { runtime: 'edge' };
export const edgeServerAction = _createRpcMethod(async function edgeServerAction({}) {
  const {
    req,
    res
  } = await getEdgeContext();
  const {
    cookies,
    headers
  } = getContext();
  // console.log('edge cookies & headers', cookies(), headers());
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;
  return {
    url,
    cookies: cookies().toString().slice(0, 20),
    headers: Array.from(headers().keys()),
    functionName: 'edgeServerAction'
  };
}, {
  name: "edgeServerAction",
  pathname: "/api/actions-edge"
}, null);
export default /*#__PURE__*/_wrapApiHandler( /*#__PURE__*/_createRpcHandler([["edgeServerAction", edgeServerAction]], true), true);