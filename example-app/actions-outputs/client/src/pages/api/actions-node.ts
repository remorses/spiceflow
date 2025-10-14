"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser";
export const createUser = /*#__PURE__*/_createRpcFetcher({
  url: "/api/actions-node",
  method: "createUser"
});
export const generateNumbers = /*#__PURE__*/_createRpcFetcher({
  url: "/api/actions-node",
  method: "generateNumbers",
  isGenerator: true
});
export const generateNumbersWithError = /*#__PURE__*/_createRpcFetcher({
  url: "/api/actions-node",
  method: "generateNumbersWithError",
  isGenerator: true
});
export const failingFunction = /*#__PURE__*/_createRpcFetcher({
  url: "/api/actions-node",
  method: "failingFunction"
});