"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser";
export const edgeServerAction = /*#__PURE__*/_createRpcFetcher("/api/actions-edge", "edgeServerAction");