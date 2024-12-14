"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser";
export const createUser = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "createUser");
export const generateNumbers = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "generateNumbers");
export const failingFunction = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "failingFunction");