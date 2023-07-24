import { JsonRpcRequest } from './jsonRpc';

type NextRpcCall = (...params: any[]) => any;

let nextId = 1;

export function createRpcFetcher(url: string, method: string): NextRpcCall {
  return function rpcFetch() {
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: nextId++,
        method,
        params: Array.prototype.slice.call(arguments),
      } satisfies JsonRpcRequest),
      headers: {
        'content-type': 'application/json',
      },
    })
      .then(function (res) {
        if (res.status === 502) {
          const statusError = new Error('Unexpected HTTP status ' + res.status);
          return res.json().then(
            (json) => {
              if (json.error && typeof json.error.message === 'string') {
                return json;
              }
              return Promise.reject(statusError);
            },
            () => Promise.reject(statusError),
          );
        }
        return res.json();
      })
      .then(function (json) {
        if (json.error) {
          let err = new Error(json.error.message);
          Object.assign(err, json.error.data || {});
          throw err;
        }
        return json.result;
      });
  };
}
