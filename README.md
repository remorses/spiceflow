<div align='center'>
    <br/>
    <br/>
    <br/>
    <h3>Server action for your Next.js Pages</h3>
    <br/>
    <br/>
</div>

This Next.js plugin let you use something like [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) with the `/pages` directory, letting you call server functions directly from your client components.

WIth Server Actions i mean calling your functions that run in the server directly in your client components, it does not closely follow the Next.js Server Actions behavior.

## Differences with Next.js Server Actions

- Actions can be imported inside `pages` and `app` files
- Actions must be defined in
  - a file inside the `/pages/api` directory with the `"poor man's use server"` directive on top
  - a route inside the `/app` directory with the `"poor man's use server"` directive on top
- No closure support, actions can be defined for an entire file(adding `"poor man's use server"` at the top of the file)
- Actions can run concurrently
- Actions can throw errors, on the client these errors will be thrown with the same error message
- Actions inputs and outputs are serialized with [superjson](https://github.com/blitz-js/superjson), a superset of JSON
- Actions do not work inside `formAction`, you call the function inside `onSubmit` instead
- To get headers and cookies you cannot import them directly from `next/headers`, instead you have to use `getContext`:

  ```ts
  "poor man's use server";
  import { cookies, headers } from 'server-actions-for-next-pages/headers';

  export async function action({}) {
    return { headers: headers(), cookies: cookies() };
  }
  ```

## Installation

```bash
npm i server-actions-for-next-pages
```

## Usage

Add the plugin to your `next.config.js` file:

```js
// next.config.js
const { withServerActions } = require('server-actions-for-next-pages');

/** @type {import('next').NextConfig} */
const nextConfig = withServerActions()({
  reactStrictMode: false,
});

module.exports = nextConfig;
```

Create a file for your server actions inside the `/pages/api` directory with `"poor man's use server"` at the top:

```ts
// pages/api/server-actions.js
"poor man's use server";

export async function serverAction() {
  return { hello: 'world' };
}
```

Import your actions in your client components:

```tsx
// pages/index.jsx
import { serverAction } from './api/server-actions';

export default function Page() {
  serverAction().then((data) => console.log(data));

  return <div>...</div>;
}
```

## Usage in edge runtime

This plugin assumes the runtime of your app to be Nodejs unless you explicitly set it to edge for your api page, this means that to support the edge runtime you need to export a config object like `export const config = { runtime: 'edge' };` in your api page.

```tsx
// pages/api/server-actions.js
"poor man's use server";

export const runtime = 'edge';

export async function serverAction() {
  return { hello: 'world' };
}
```

## Accessing the request and response objects

This plugin injects the `req` and `res` objects in an `AsyncLocalStorage` context, so you can access them in your server functions:

Edge function example:

```ts
"poor man's use server";

import { cookies, headers } from 'server-actions-for-next-pages/headers';

export const runtime = 'edge';

export async function serverAction({}) {
  const host = headers().get('host');
  return { host };
}
```

Example in Node.js:

```ts
"poor man's use server";
import { cookies, headers } from 'server-actions-for-next-pages/headers';

export async function createUser({ name = '' }) {

  const host = headers().get('host');

  return {
    name,
    host,
  };
}
```

## Adding error logging and handling

You can export a function named `wrapMethod` to easily wrap all your server actions with error logging or other wrappers

```ts
"poor man's use server";

export function wrapMethod(fn) {
  return async (...args) => {
    try {
      const res = await fn(...args);
      return res;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
}

export async function failingFunction({}) {
  throw new Error('This function fails');
}
```

## Aborting requests with AbortSignal

You can abort ongoing server actions using `AbortController` and `AbortSignal`. Pass an abort signal in your arguments (either directly or as a field in an object parameter), and it will be used to:

- **Client-side**: Abort the fetch request
- **Server-side**: Allow server functions to respond to request cancellations

```ts
// pages/api/server-actions.js
"poor man's use server";

export async function longRunningTask(signal: AbortSignal) {
  for (let i = 0; i < 10; i++) {
    // Check if the request was aborted
    if (signal.aborted) {
      throw new Error('Task aborted: ' + signal.reason);
    }
    await sleep(1000);
  }
  return { completed: true };
}

// Also works with async generators
export async function* streamData({ signal }: { signal: AbortSignal }) {
  for (let i = 0; i < 20; i++) {
    if (signal.aborted) {
      throw new Error('Stream aborted: ' + signal.reason);
    }
    await sleep(500);
    yield { count: i };
  }
}
```

Client usage:

```tsx
// pages/index.tsx
import { longRunningTask, streamData } from './api/server-actions';

export default function Page() {
  const handleAbortableTask = async () => {
    const controller = new AbortController();
    
    // Abort after 2 seconds
    setTimeout(() => controller.abort('Timeout'), 2000);

    try {
      await longRunningTask(controller.signal);
    } catch (error) {
      console.log(error); // "Task aborted: Timeout"
    }
  };

  const handleAbortableStream = async () => {
    const controller = new AbortController();
    const generator = streamData({ signal: controller.signal });
    
    for await (const { count } of generator) {
      console.log(count);
      if (count > 5) {
        controller.abort('User stopped stream');
        break;
      }
    }
  };

  return <div>...</div>;
}
```

**Note**: You can pass `AbortSignal` or `AbortController` directly as arguments, or as fields within object parameters. The server function will receive the request's abort signal, allowing it to detect when the client cancels the request (e.g., when navigating away).

## Custom fetch function

You can provide a custom `fetch` function to your server actions by including it as a `fetch` field in an object parameter. This is useful for adding custom headers, authentication, or using a custom fetch implementation.

```ts
// pages/api/server-actions.js
"poor man's use server";

export async function fetchExternalData({ url, fetch }) {
  // The fetch parameter will be either:
  // - The custom fetch function passed from the client
  // - The global fetch function (injected automatically on the server)
  const response = await fetch(url);
  return response.json();
}
```

Client usage with custom fetch:

```tsx
// pages/index.tsx
import { fetchExternalData } from './api/server-actions';

export default function Page() {
  const handleFetch = async () => {
    // Define a custom fetch with authentication
    const customFetch = (url, options) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': 'Bearer my-token',
        },
      });
    };

    const data = await fetchExternalData({ 
      url: 'https://api.example.com/data',
      fetch: customFetch 
    });
    console.log(data);
  };

  return <div>...</div>;
}
```

**How it works**:
- **Client-side**: If you provide a `fetch` field in an object parameter, it will be used for the RPC call instead of the global `fetch`
- **Server-side**: The global `fetch` function is automatically injected into object parameters (unless you already provided your own)
- User-provided fetch functions always take precedence over the injected one

## How it works

The plugin will replace the content of files inside `pages/api` with `"poor man's use server"` at the top to make the exported functions callable from the browser.

When processing the file for the server the plugin creates an API handler that follows the JSON RPC spec.

When processing the file for the client the plugin replaces the exported functions with a `fetch` calls to the API handler.

This plugin uses Babel to process your page content, it will not slow down compilation time noticeably because it only process files inside the `pages/api` folder.

## Credits

This is a fork of the awesome [next-rpc](https://github.com/Janpot/next-rpc) with some changes:

- It supports the Edge runtime
- Uses superjson to serialize and deserialize arguments and results
- It sets status code to 502 when the server function throws an error
- It uses the top level `"poor man's use server"` instead of the `config.rpc` option
- `wrapMethod` can be defined with an export instead of `config.wrapMethod`
