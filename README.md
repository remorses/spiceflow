<div align='center'>
    <br/>
    <br/>
    <br/>
    <h3>Server action for your Next.js Pages</h3>
    <br/>
    <br/>
</div>

This Next.js plugin let you use something like [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) using the `/pages` directory, letting you call your server functions directly from your client components.

WIth Server Actions i mean calling your server functions directly in your client components, it does not closely follow the Next.js Server Actions behavior:

## Differences with Next.js Server Actions

- It does not depend on any React canary features, it just turns your server functions into a `fetch` calls in the client
- It works both inside `pages` and `app` directories
- It only works for an entire file (adding `"poor man user server"` at the top of the file)
- Server actions files must be inside the `pages/api` directory
- It's already stable, it's pretty simple concept that does not depend on any React canary features

## Installation

```bash
npm install --save-dev server-actions-for-pages
```

## Usage

Add the plugin to your `next.config.js` file:

```js
// next.config.js
const { withServerActions } = require('server-actions-for-pages');

/** @type {import('next').NextConfig} */
const nextConfig = withServerActions()({
  reactStrictMode: false,
});

module.exports = nextConfig;
```

Create a file for your server actions inside the `/pages/api` directory with `'poor man user server'` at the top:

```ts
// pages/api/server-actions.js
'poor man user server';

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

## How it works

The plugin will replace the content of files with `"poor man user server"` at the top with inside the `pages/api` directory to make the exported functions callable from the client.

When processing the file for the server the plugin creates an API handler that follows the JSON RPC spec. The API handler works both with edge and Node.js runtimes.

When processing the file for the client the plugin replaces the exported functions with a `fetch` call to the API handler.

## Credits

This is a fork of the awesome [next-rpc](https://github.com/Janpot/next-rpc) with some changes:

- Ti supports the Edge runtime
- It sets status code to 502 when the server function throws an error
- It uses the top level `'poor man user server'` instead of the `config.rpc` option
- `wrapMethod` can be defined with an export instead of `config.wrapMethod`
