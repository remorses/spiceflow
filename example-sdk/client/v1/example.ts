import { createRpcFetcher } from 'spiceflow/dist/browser.js';
import * as methods from './../../src/v1/example.js';
export const action: typeof methods['action'] = createRpcFetcher({
  url: "http://localhost:3333/v1/example",
  method: "action",
  isGenerator: false
});