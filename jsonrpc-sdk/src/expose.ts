import http from 'http';
import { internalNodeJsHandler } from './server';

export async function exposeNodeServer({ methodsMap, basePath, port }) {
  const handler = internalNodeJsHandler({ methodsMap });

  const server = http.createServer(async (req, res) => {
    let ended = false;
    res.on('close', () => {
      ended = true;
    });

    try {
      if (req.method === 'GET' && req.url === '/') {
        res.statusCode = 200;
        res.end('ok');
        return;
      }
      console.log(`[jsonrpc-sdk] ${req.url}`);
      await handler({ req, res, basePath });
    } catch (error) {
      if (ended) {
        return;
      }
      console.error(error);

      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.listen(port, () => {
    console.log(`server listening on http://127.0.0.1:${port}`);
  });
}
