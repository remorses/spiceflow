import { methodsMap } from './server/index.js'; import { exposeNodeServer } from 'jsonrpc-sdk/dist/expose.js'; exposeNodeServer({ methodsMap, basePath: '/', port: 3333 });