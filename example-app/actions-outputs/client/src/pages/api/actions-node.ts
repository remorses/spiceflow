"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser.js";
export const createUser = /*#__PURE__*/_createRpcFetcher({
  "url": "/api/actions-node",
  "method": "createUser",
  "isGenerator": false
});
export const asyncGeneratorActionNode = /*#__PURE__*/_createRpcFetcher({
  "url": "/api/actions-node",
  "method": "asyncGeneratorActionNode",
  "isGenerator": true
});
export const failingFunction = /*#__PURE__*/_createRpcFetcher({
  "url": "/api/actions-node",
  "method": "failingFunction",
  "isGenerator": false
});
export const sendMessage = /*#__PURE__*/_createRpcFetcher({
  "url": "/api/actions-node",
  "method": "sendMessage",
  "isGenerator": false
});