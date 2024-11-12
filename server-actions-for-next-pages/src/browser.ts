import { JsonRpcRequest } from './jsonRpc';


type NextRpcCall = (...params: any[]) => any;

let nextId = 1;

export function createRpcFetcher(url: string, method: string): NextRpcCall {
  return async function rpcFetch(...args) {
    const superjson = await import('superjson');
    const { json, meta } = superjson.serialize(args);
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(
        {
          jsonrpc: '2.0',
          id: nextId++,
          method,
          params: json as any[],
          meta,
        } satisfies JsonRpcRequest,
        null,
        2,
      ),
      headers: {
        'content-type': 'application/json',
      },
    });
    if (res.status === 502) {
      const statusError = new Error('Unexpected HTTP status ' + res.status);
      const json = await res.json();

      if (json?.error && typeof json.error.message === 'string') {
        let err = new Error(json.error.message);
        Object.assign(err, json.error.data || {});
        throw err;
      }

      throw statusError;
    }
    {
      const json = await res.json();
      const deserialized = superjson.deserialize({
        json: json.result,
        meta: json.meta,
      });
      return deserialized as any;
    }
  };
}
