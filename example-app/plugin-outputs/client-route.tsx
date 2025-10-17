"poor man's use server";

import { createRpcFetcher as _createRpcFetcher } from "server-actions-for-next-pages/dist/browser";
export const sendMessage = /*#__PURE__*/_createRpcFetcher("/optimistic/actions", "sendMessage");