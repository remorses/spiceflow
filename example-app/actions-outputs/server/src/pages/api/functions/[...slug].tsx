import { wrapApiHandler as _wrapApiHandler } from "server-actions-for-next-pages/dist/context-internal";
import { nodeJsHandler } from 'example-sdk/src/server';
export default /*#__PURE__*/_wrapApiHandler(async function handler(req, res) {
  return await nodeJsHandler({
    req,
    res,
    basePath: '/api/functions'
  });
}, false);