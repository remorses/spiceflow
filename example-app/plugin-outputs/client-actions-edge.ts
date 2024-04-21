"poor man's use server";

export const runtime = 'edge';
// export const config = { runtime: 'edge' };

// async generator
import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser.js";
export const asyncGeneratorActionEdge = /*#__PURE__*/_createRpcFetcher({
  "url": "/api/actions-edge",
  "method": "asyncGeneratorActionEdge",
  "isGenerator": true
});
export const edgeServerAction = /*#__PURE__*/_createRpcFetcher({
  "url": "/api/actions-edge",
  "method": "edgeServerAction",
  "isGenerator": false
});