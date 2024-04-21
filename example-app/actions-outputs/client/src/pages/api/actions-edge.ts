"poor man's use server";

export const runtime = 'edge';
// export const config = { runtime: 'edge' };
import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser.js";
export const edgeServerAction = /*#__PURE__*/_createRpcFetcher("/api/actions-edge", "edgeServerAction");