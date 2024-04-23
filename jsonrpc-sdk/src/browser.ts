import { JsonRpcRequest, JsonRpcResponse } from './jsonRpc';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import { generate } from 'fast-glob/out/managers/tasks';

import superjson from 'superjson';

type NextRpcCall = (...params: any[]) => any | AsyncGenerator<any>;

let nextId = 1;

export function createRpcFetcher({
  url,
  method,
  isGenerator,
}: {
  url: string;
  method: string;
  isGenerator?: boolean;
}): NextRpcCall {
  const controller = new AbortController();
  if (isGenerator) {
    const generator = async function* rpcFetchGenerator(...args) {
      const { json, meta } = superjson.serialize(args);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: nextId++,
          method,
          params: json as any[],
          meta,
        } satisfies JsonRpcRequest),
      });
      if (res.status >= 400) {
        const json = await res.json();
        await handleJsonrpcError({ status: res.status, json });
      }

      if (!res.body) {
        throw new Error('No response body for generator action');
      }
      const eventStream = res.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream())
        .getReader();
      let isClosed = false;
      try {
        while (true) {
          const { value: event, done } = await eventStream.read();

          if (done) {
            isClosed = true;
            break;
          }
          if (!event) continue;

          if (event.data === '[DONE]') {
            continue;
          }

          const json = JSON.parse(event.data);

          const { jsonrpc, id, result, meta, error } = json as JsonRpcResponse;
          await handleJsonrpcError({ status: res.status, json });
          const deserialized = superjson.deserialize({
            json: result,
            meta,
          });
          yield deserialized;
        }
      } finally {
        // if user calls return() in the generator, we need to close the stream

        if (!isClosed) {
          // if stream is still open, abort controller
          controller.abort();
          eventStream.cancel();
        }
      }
    };

    return generator;
  }
  async function rpcFetch(...args) {
    const { json: argsJson, meta } = superjson.serialize(args);
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(
        {
          jsonrpc: '2.0',
          id: nextId++,
          method,
          params: argsJson as any[],
          meta,
        } satisfies JsonRpcRequest,
        null,
        2,
      ),
      headers: {
        'content-type': 'application/json',
      },
    });
    const json = await res.json();
    await handleJsonrpcError({ status: res.status, json });
    {
      const deserialized = superjson.deserialize({
        json: json.result,
        meta: json.meta,
      });
      return deserialized as any;
    }
  }
  rpcFetch.abort = function abort() {
    controller.abort();
  };
  return rpcFetch;
}

async function handleJsonrpcError({
  status,
  json,
}: {
  status: number;
  json: JsonRpcResponse;
}) {
  if (status >= 400) {
    const statusError = new Error('Unexpected HTTP status ' + status);

    if (json?.error && typeof json.error?.message === 'string') {
      let err = new Error(json.error.message);
      Object.assign(err, json.error.data || {});
      throw err;
    }

    throw statusError;
  }
}
