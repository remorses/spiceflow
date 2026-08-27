---
'spiceflow': minor
---

Add dependency-free WebMCP support to the fetch client. `installWebMcp({ fetch, openapiPath })` loads route input schemas from the server's OpenAPI document, registers matching browser tools, executes them through the configured fetch client, and preserves tools that the application already registered. Use exact `include` and `exclude` route filters to control which API operations agents can call. Setup errors are logged and return a no-op cleanup function instead of blocking application startup.
