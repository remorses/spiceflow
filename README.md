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
- No closure support, it only works for an entire file (adding `"poor man's use server"` at the top of the file)
- Server actions files must be inside the `/pages/api` directory
- To get headers and cookies you cannot import them directly from `next/headers`, instead you have to use `getContext`:

  ```ts
  import { getContext } from 'server-actions-for-next-pages/context';
  export async function action({}) {
    const { headers, cookies } = await getContext();
    return { headers, cookies };
  }
  ```

- It does not work inside `formAction`, you call the function inside `onSubmit` instead
- `startTransition` will not track pending state, just use `useState` to track the loading state

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

import { getContext } from 'server-actions-for-next-pages/context';

export const runtime = 'edge';

export async function serverAction({}) {
  const { headers, cookies } = await getContext();
  const host = headers().get('host');
  return { host };
}
```

Example in Node.js:

```ts
"poor man's use server";
import { getContext } from 'server-actions-for-next-pages/context';

export async function createUser({ name = '' }) {
  const { headers, cookies } = await getContext();
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

## How it works

The plugin will replace the content of files inside `pages/api` with `"poor man's use server"` at the top to make the exported functions callable from the browser.

When processing the file for the server the plugin creates an API handler that follows the JSON RPC spec.

When processing the file for the client the plugin replaces the exported functions with a `fetch` calls to the API handler.

This plugin uses Babel to process your page content, it will not slow down compilation time noticeably because it only process files inside the `pages/api` folder.

## Credits

This is a fork of the awesome [next-rpc](https://github.com/Janpot/next-rpc) with some changes:

- It supports the Edge runtime
- It sets status code to 502 when the server function throws an error
- It uses the top level `"poor man's use server"` instead of the `config.rpc` option
- `wrapMethod` can be defined with an export instead of `config.wrapMethod`
