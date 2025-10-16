"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser";
export const createUser = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "createUser");
export const generateNumbers = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "generateNumbers", true);
export const generateNumbersWithError = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "generateNumbersWithError", true);
export const failingFunction = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "failingFunction");
export const longRunningTask = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "longRunningTask");
export const streamWithAbort = /*#__PURE__*/_createRpcFetcher("/api/actions-node", "streamWithAbort", true);