import { JsonRpcRequest } from './jsonRpc';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Workaround for https://github.com/facebook/create-react-app/issues/4760
 * See https://github.com/zeit/next.js/blob/b88f20c90bf4659b8ad5cb2a27956005eac2c7e8/packages/next/client/dev/error-overlay/hot-dev-client.js#L105
 */
function rewriteStacktrace(error: Error): Error {
  const toReplaceRegex = new RegExp(
    escapeRegExp(process.env.__NEXT_DIST_DIR as string),
    'g',
  );
  error.stack =
    error.stack && error.stack.replace(toReplaceRegex, '/_next/development');
  return error;
}

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
          if (process.env.NODE_ENV !== 'production') {
            err = rewriteStacktrace(err);
          }
          throw err;
        }
        return json.result;
      });
  };
}
