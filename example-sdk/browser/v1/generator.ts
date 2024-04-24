import { createRpcFetcher } from 'spiceflow/dist/browser.js';
import * as methods from './../../src/v1/generator.js';
export const generator: typeof methods['generator'] = createRpcFetcher({
  url: "http://localhost:3333/v1/generator",
  method: "generator",
  isGenerator: true
});