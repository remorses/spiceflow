# Model Context Protocol (MCP)

Spiceflow includes a Model Context Protocol (MCP) plugin that exposes your API routes as tools and resources that can be used by AI language models like Claude. The MCP plugin makes it easy to let AI assistants interact with your API endpoints in a controlled way.

When you mount the MCP plugin (default path is `/mcp`), it automatically:

- Exposes all your routes as callable tools with proper input validation
- Exposes GET routes without query/path parameters as `resources`
- Provides an SSE-based transport for real-time communication
- Handles serialization of requests and responses

This makes it simple to let AI models like Claude discover and call your API endpoints programmatically.

## Basic MCP Usage

Here's an example:

```tsx
// Import the MCP plugin and client
import { mcp } from 'spiceflow/mcp'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { Spiceflow } from 'spiceflow'
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  ListResourcesResultSchema,
} from '@modelcontextprotocol/sdk/types.js'

// Create a new app with some example routes
export const app = new Spiceflow()
  // Mount the MCP plugin at /mcp (default path)
  .use(mcp())
  // These routes will be available as tools
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello World'
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id',
    handler({ params }) {
      return { id: params.id }
    },
  })
  .route({
    method: 'POST',
    path: '/echo',
    async handler({ request }) {
      const body = await request.json()
      return body
    },
  })

// Start the server
app.listen(3000)

// Example client usage:
const transport = new SSEClientTransport(new URL('http://localhost:3000/mcp'))

const client = new Client(
  { name: 'example-client', version: '1.0.0' },
  { capabilities: {} },
)

await client.connect(transport)

// List available tools
const tools = await client.request(
  { method: 'tools/list' },
  ListToolsResultSchema,
)

// Call a tool
const result = await client.request(
  {
    method: 'tools/call',
    params: {
      name: 'GET /hello',
      arguments: {},
    },
  },
  CallToolResultSchema,
)

// List available resources (only GET /hello is exposed since it has no params)
const resources = await client.request(
  { method: 'resources/list' },
  ListResourcesResultSchema,
)
```

## Existing MCP Servers

If you already have an existing MCP server and want to add Spiceflow route tools to it, use the `addMcpTools` helper function:

```ts
import { addMcpTools } from 'spiceflow/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { Spiceflow } from 'spiceflow'

// Your existing MCP server
const existingServer = new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } },
)

// Your Spiceflow app
export const app = new Spiceflow()
  .use(mcp()) // Required for MCP configuration
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello from Spiceflow!'
    },
  })

// Add Spiceflow tools to your existing server
const mcpServer = await addMcpTools({
  mcpServer: existingServer,
  app,
  ignorePaths: ['/mcp', '/sse'],
})

// Now your existing server has access to all Spiceflow routes as tools
```
