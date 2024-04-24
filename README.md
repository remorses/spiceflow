<div align='center'>
    <br/>
    <br/>
    <br/>
    <h3>spiceflow</h3>
    <br/>
    <p>If GraphQL, JSON-RPC and React server actions had a baby, it would be called spiceflow</p>
    <br/>
    <br/>
    
</div>

Spiceflow is the fastest way to write and expose an RPC API. In Spiceflow any files with the directive `'use spiceflow'` will be processed as an API route, each function defined in the file will be exposed as an JSON-RPC method.

After defining your functions you can call `spiceflow serve` to start a server exposing your API, you can also espose the API using the Next.js or your own server.

When calling `spiceflow build` spiceflow will generate a client side SDK for your API, you can use it to call your API from the browser. This client SDK will be type safe, because the functions are called the same way from the server and the client, so types can be reused (after being bundled with @microsoft/api-extractor).

You can publish this SDK to npm and let your users interact with your API in an easy and type safe way.

## Installation

```bash
npm i spiceflow
```

## Usage

```bash
# create a new spiceflow project, works best in a monorepo
npx spiceflow init --name my-api
tree
.
├── package.json
├── src
│   ├── index.ts
│   └── v1
│       ├── example.ts
│       └── generator.ts
└── tsconfig.json

npm run serve # builds the sdk in the dist folder and starts serving your API
npm run try-sdk # try using the sdk
```

## Writing your API functions

Any functions exported in a file with the `'use spiceflow'` directive will be processed as an API route, each function defined in the file will be exposed as an JSON-RPC method.

```ts
// src/v1/functions.ts
'use spiceflow';

export async function spiceflowFunction() {
  return { hello: 'world' };
}

export async function* spiceflowGenerator() {
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield { i };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

Expose the server

```bash
spiceflow serve --watch
```

Call your function from the client, these will use fetch to call the server

```ts
import {
  spiceflowFunction,
  spiceflowGenerator,
} from './my-api/dist/v1/functions';

// will call the server with fetch
const { hello } = await spiceflowFunction();

for await (const { i } of spiceflowGenerator()) {
  console.log(i);
}
```

## Serving your API

Spiceflow has 3 ways to serve your API:

### Built-in Node.js server

```
spiceflow serve --port 3333
```

### Next.js pages API handler

> Note: You will need to call `spiceflow build` before using the SDK when using this method

```tsx
// pages/api/spiceflow/[...slug].tsx
import { nodeJsHandler } from './my-api/server';

export default async function handler(req, res) {
  return await nodeJsHandler({ req, res, basePath: '/api/spiceflow' });
}
```

### Next.js app API route

```tsx
// pages/api/spiceflow/[...slug]/route.tsx
import { edgeHandler } from './my-api/server';

export const POST = edgeHandler;
```

After exposing your server you will need to rebuild your client sdk using that url:

```bash
spiceflow build --url http://localhost:3000/api/spiceflow # the Next.js app url
```

## Accessing the request and response objects

This plugin injects the `req` and `res` objects in an `AsyncLocalStorage` context, so you can access them in your server functions:

Edge function example:

```ts
'use spiceflow';

import { getNodejsContext } from 'spiceflow/context';

export async function serverAction({}) {
  const { req } = getNodejsContext();
  const host = req?.headers.get('host');
  return { host };
}
```

## Adding error logging and handling

You can export a function named `wrapMethod` to easily wrap all your server actions with error logging or other wrappers

```ts
'use spiceflow';

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

## Versioning

You can create a `v1` folder in your project and exports your function from `index.ts`, when you want to release a breaking version of your API, you can create a new folder and change the imports in `index.ts` file. This way the sdk users will always use the latest version of your API, while old SDK users will keep the old version.

## How it works

Spiceflow `build` command transpiles the files with the `use spiceflow` directive so that any exported function will use fetch to send arguments and get the result, the the transformed files are saved in the `dist` folder. Other files are compiled to the dist directory using `tsc`. Spiceflow also bundles the type definitions with `@microsoft/api-extractor` so the generated dist files don't rely on external local packages and can be safely published to npm.
