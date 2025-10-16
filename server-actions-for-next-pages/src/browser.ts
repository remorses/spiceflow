import { JsonRpcRequest } from './jsonRpc';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import { registerAbortControllerSerializers, findAbortSignalInArgs } from './superjson-setup';

type NextRpcCall = (...params: any[]) => any;

let nextId = 1;

async function* yieldServerSentEvents(response: Response, superjson: any) {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const eventStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  const reader = eventStream.getReader();

  while (true) {
    const { done, value: event } = await reader.read();
    if (done) break;

    if (event?.event === 'error') {
      throw new Error(event.data);
    }

    if (event) {
      const data = JSON.parse(event.data);
      const deserialized = superjson.deserialize({
        json: data.result,
        meta: data.meta,
      });
      yield deserialized;
    }
  }
}

export function createRpcFetcher(
  url: string,
  method: string,
  isGenerator?: boolean,
): NextRpcCall {
  if (isGenerator) {
    return async function* rpcGeneratorFetch(...args) {
      const superjson = await import('superjson');
      registerAbortControllerSerializers(superjson.default);
      const abortSignal = findAbortSignalInArgs(args);
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
        signal: abortSignal,
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

      const contentType = res.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        yield* yieldServerSentEvents(res, superjson.default);
      }
    };
  }

  return async function rpcFetch(...args) {
    const superjson = await import('superjson');
    registerAbortControllerSerializers(superjson.default);
    const abortSignal = findAbortSignalInArgs(args);
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
      signal: abortSignal,
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

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      return await yieldServerSentEvents(res, superjson.default);
    } else {
      const json = await res.json();
      const deserialized = superjson.deserialize({
        json: json.result,
        meta: json.meta,
      });
      return deserialized as any;
    }
  };
}
