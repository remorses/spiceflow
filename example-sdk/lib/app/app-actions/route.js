"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser.js";
export const appServerAction = /*#__PURE__*/_createRpcFetcher("http://localhost:7754/app-actions", "appServerAction");