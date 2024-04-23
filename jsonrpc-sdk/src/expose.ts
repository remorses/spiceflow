import { IncomingMessage, ServerResponse } from 'http';
import { JsonRpcError, JsonRpcRequest } from './jsonRpc';

declare const actions: Record<string, () => Promise<any>>;

export async function edgeServer(req: Request) {
  if (!actions) {
    const message =
      'No actions found from jsonrpc-actions route! Plugin not installed correctly';
    console.error(message);
    const jsonRpcError: JsonRpcError = {
      code: 1,
      message,
    };

    return new Response(JSON.stringify(jsonRpcError), {
      status: 500,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
  const path = new URL(req.url).pathname;
  const found = actions[path];
  if (!found) {
    const jsonRpcError: JsonRpcError = {
      code: 1,
      message: `Invalid path ${path}`,
      data: {
        path: path,
      },
    };
    return new Response(JSON.stringify(jsonRpcError), {
      status: 404,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
  const module = await found();
  const json = (await req.json()) as JsonRpcRequest;
  const method = json.method;
  if (!module[method]) {
    const jsonRpcError: JsonRpcError = {
      code: 1,
      message: `Invalid path ${path}`,
      data: {
        path: path,
      },
    };
    return new Response(JSON.stringify(jsonRpcError), {
      status: 404,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
  const handler = module[method];
}

export async function nodeServer(req: IncomingMessage, res: ServerResponse) {
  if (!actions) {
    const message =
      'No actions found from jsonrpc-actions route! Plugin not installed correctly';
    console.error(message);
    res.writeHead(500, {
      'content-type': 'application/json',
    });
    const jsonRpcError: JsonRpcError = {
      code: 1,
      message,
    };

    res.end(JSON.stringify(jsonRpcError));
    return;
  }
  const path = req.url!;
  const found = actions[path];
  if (found) {
    const handler = await found();
    return await handler(req);
  }
  const jsonRpcError: JsonRpcError = {
    code: 1,
    message: `Invalid path ${path}`,
    data: {
      path: path,
    },
  };
  res.writeHead(404, {
    'content-type': 'application/json',
  });
  res.end(JSON.stringify(jsonRpcError));
}
