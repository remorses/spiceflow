// this file was generated
import { internalEdgeHandler, internalNodeJsHandler } from 'jsonrpc-sdk/dist/server';
const methodsMap = {"/example": () => import('./example')}
export const edgeHandler = internalEdgeHandler({ methodsMap });
export const nodeJsHandler = internalNodeJsHandler({ methodsMap });
