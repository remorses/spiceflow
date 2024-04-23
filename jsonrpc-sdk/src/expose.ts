import { IncomingMessage, ServerResponse } from 'http';
import { JsonRpcError, JsonRpcRequest } from './jsonRpc';

declare const actions: Record<string, () => Promise<any>>;
