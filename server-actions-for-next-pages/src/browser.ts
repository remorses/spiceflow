import { JsonRpcRequest } from './jsonRpc';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import { registerAbortControllerSerializers, findAbortSignalInArgs, findFetchInArgs } from './superjson-setup';

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
      let errorData: { name?: string; message?: string; stack?: string; thrownValue?: unknown };
      try {
        errorData = JSON.parse(event.data);
      } catch {
        // Fallback for plain text errors (backwards compatibility)
        errorData = { message: event.data || 'Unknown server error' };
      }
      const error = new Error(errorData.message || 'Unknown server error');
      if (errorData.name) error.name = errorData.name;
      if (errorData.stack) error.stack = errorData.stack;
      if (errorData.thrownValue !== undefined) {
        (error as any).thrownValue = errorData.thrownValue;
      }
      throw error;
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
      const customFetch = findFetchInArgs(args) || fetch;
      const { json, meta } = superjson.serialize(args);
      const res = await customFetch(url, {
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

      const contentType = res.headers.get('content-type');
      
      // Handle error responses (non-2xx status codes or JSON error responses)
      if (!res.ok || !contentType?.includes('text/event-stream')) {
        // Try to parse JSON error response
        let jsonBody: any;
        try {
          jsonBody = await res.json();
        } catch {
          // JSON parsing failed, fall through to status error
        }
        
        if (jsonBody?.error && typeof jsonBody.error.message === 'string') {
          const err = new Error(jsonBody.error.message);
          Object.assign(err, jsonBody.error.data || {});
          throw err;
        }
        
        throw new Error('Unexpected HTTP status ' + res.status);
      }

      yield* yieldServerSentEvents(res, superjson.default);
    };
  }

  return async function rpcFetch(...args) {
    const superjson = await import('superjson');
    registerAbortControllerSerializers(superjson.default);
    const abortSignal = findAbortSignalInArgs(args);
    const customFetch = findFetchInArgs(args) || fetch;
    const { json, meta } = superjson.serialize(args);
    const res = await customFetch(url, {
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

    // Handle error responses (non-2xx status codes)
    if (!res.ok) {
      let jsonBody: any;
      try {
        jsonBody = await res.json();
      } catch {
        // JSON parsing failed, fall through to status error
      }
      
      if (jsonBody?.error && typeof jsonBody.error.message === 'string') {
        const err = new Error(jsonBody.error.message);
        Object.assign(err, jsonBody.error.data || {});
        throw err;
      }
      
      throw new Error('Unexpected HTTP status ' + res.status);
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      return await yieldServerSentEvents(res, superjson.default);
    } else {
      const jsonBody = await res.json();
      const deserialized = superjson.deserialize({
        json: jsonBody.result,
        meta: jsonBody.meta,
      });
      return deserialized as any;
    }
  };
}
