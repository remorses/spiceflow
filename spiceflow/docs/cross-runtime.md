# Spiceflow Cross-Runtime Support

Spiceflow now supports all major JavaScript runtimes:

- Node.js
- Deno
- Bun
- Cloudflare Workers

This document provides examples of how to use Spiceflow in each runtime.

## Common API Usage

The basic Spiceflow API is the same across all runtimes. You create routes, define handlers, and use middleware in the same way:

```typescript
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()

app.get('/', () => 'Hello World!')
app.get('/json', () => ({ message: 'Hello from Spiceflow!' }))
app.get('/users/:id', ({ params }) => ({ id: params.id, name: `User ${params.id}` }))
```

## Runtime-Specific Server Creation

The main difference is how you start your server in each runtime. Spiceflow provides runtime-specific `serve` functions.

### Node.js

```typescript
import { Spiceflow } from 'spiceflow'
import { serve } from 'spiceflow/server' // Automatically selects Node.js implementation

const app = new Spiceflow()
app.get('/', () => 'Hello from Node.js!')

const server = await serve(app, {
  port: 3000,
  onListen: (address) => console.log(`Server running at ${address}`)
})

// To stop the server:
// await server.close()
```

### Deno

```typescript
import { Spiceflow } from 'spiceflow'
import { serve } from 'spiceflow/server' // Automatically selects Deno implementation

const app = new Spiceflow()
app.get('/', () => 'Hello from Deno!')

const server = await serve(app, {
  port: 3000,
  onListen: (address) => console.log(`Server running at ${address}`)
})

// To stop the server:
// await server.close()
```

### Bun

```typescript
import { Spiceflow } from 'spiceflow'
import { serve } from 'spiceflow/server' // Automatically selects Bun implementation

const app = new Spiceflow()
app.get('/', () => 'Hello from Bun!')

const server = await serve(app, {
  port: 3000,
  onListen: (address) => console.log(`Server running at ${address}`)
})

// To stop the server:
// await server.close()
```

### Cloudflare Workers

```typescript
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
app.get('/', () => 'Hello from Cloudflare Workers!')

// In Workers, you export a fetch handler
export default {
  fetch(request, env, ctx) {
    return app.handle(request)
  }
}
```

## MCP (Model Context Protocol) Support

Spiceflow also provides runtime-specific implementations for MCP transports. Using MCP works the same across all runtimes:

```typescript
import { Spiceflow } from 'spiceflow'
import { mcp } from 'spiceflow/mcp'

const app = new Spiceflow()
app.get('/', () => 'Hello World!')

// Add MCP support
app.use(mcp())

// Start the server
// ...
```

## Using .ts Extensions

With the new TypeScript configuration, you can use `.ts` extensions in your imports for better compatibility with Deno:

```typescript
import { Spiceflow } from 'spiceflow/index.ts'
import { serve } from 'spiceflow/server/index.ts'

// For a specific runtime implementation:
// import { serve } from 'spiceflow/server/deno.ts'
```

## Benefits

- **Isomorphic Code**: Write your API once, run it anywhere
- **Runtime-Specific Optimizations**: Each runtime gets a tailored implementation
- **No Dead Code**: Runtime-specific code is only imported in the appropriate runtime
- **Consistent API**: The same API works across all runtimes
- **Tested Compatibility**: CI tests ensure compatibility across all supported runtimes

## Notes

- The deprecated `listen()` method is still available for backward compatibility, but using the `serve()` function is recommended.
- In Cloudflare Workers, due to its serverless nature, you typically just use the `handle()` method with the Workers fetch handler.
