<div align='center'>
    <br/>
    <br/>
    <br/>
    <h3>spiceflow</h3>
    <p>If GraphQL and server actions had a baby</p>
    <br/>
    <br/>
</div>

```ts
"use spiceflow"
import { cookies, headers } from 'spiceflow/headers';

export async function action({}) {
  return { headers: headers(), cookies: cookies() };
}
```

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

npm run serve # build the sdk in the dist folder and start a server exposing your API
npm run try-sdk # try using the sdk
```

## Writing your API functions

Write your functions

```ts
// src/v1/functions.ts
"use spiceflow"

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
spiceflow serve
```

Build the client sdk to the dist folder

```bash
spiceflow build
```

Call your function from the client, they will use fetch to call the server

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
"use spiceflow"

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
"use spiceflow"

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
