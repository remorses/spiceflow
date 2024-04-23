import { nodeJsHandler } from 'example-sdk/src/server';

export default async function handler(req, res) {
  return await nodeJsHandler({ req, res, basePath: '/api/functions' });
}
