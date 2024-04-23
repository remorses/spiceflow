// this file was generated
import { internalEdgeHandler, internalNodeJsHandler } from 'jsonrpc-sdk/dist/server';
const methodsMap = {"/v1/another-file": () => import('./v1/another-file'),"/v1/example": () => import('./v1/example')}
export const edgeHandler = internalEdgeHandler({ methodsMap });
export const nodeJsHandler = internalNodeJsHandler({ methodsMap });
