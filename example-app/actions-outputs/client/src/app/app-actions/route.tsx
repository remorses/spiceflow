"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser";
export const appServerAction = /*#__PURE__*/_createRpcFetcher("/app-actions", "appServerAction");