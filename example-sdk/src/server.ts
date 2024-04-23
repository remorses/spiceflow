import { internalEdgeHandler, internalNodeJsHandler } from 'jsonrpc-sdk/dist/server';
const methodsMap = {"/example.ts": () => import('./example')}
export const edgeHandler = internalEdgeHandler({ methodsMap });
export const nodeJsHandler = internalNodeJsHandler({ methodsMap });
