"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser.js";
export const createUser = /*#__PURE__*/_createRpcFetcher("http://localhost:7754/api/actions-node", "createUser");
export const failingFunction = /*#__PURE__*/_createRpcFetcher("http://localhost:7754/api/actions-node", "failingFunction");