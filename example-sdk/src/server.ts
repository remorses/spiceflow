// this file was generated
import { internalEdgeHandler, internalNodeJsHandler } from 'spiceflow/dist/server.js';
export const methodsMap = {"/v1/example": () => import('./v1/example.js'),"/v1/generator": () => import('./v1/generator.js')} as any
export const edgeHandler = internalEdgeHandler({ methodsMap });
export const nodeJsHandler = internalNodeJsHandler({ methodsMap });
