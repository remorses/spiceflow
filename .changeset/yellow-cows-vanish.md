---
'spiceflow': patch
---

Add x-spiceflow-agent header to client requests to identify requests coming from the Spiceflow client. This header is set to 'spiceflow-client' for all requests made through the createSpiceflowClient function.

Add `disableSuperJsonUnlessRpc` option to Spiceflow constructor. When set to `true`, superjson serialization is only applied to responses when the request includes the `x-spiceflow-agent: spiceflow-client` header. This allows you to disable superjson for regular HTTP requests while keeping it enabled for RPC clients. In a future major version, this will become the default behavior.

Convert `superjsonSerialize` and `turnHandlerResultIntoResponse` from standalone functions to private methods of the Spiceflow class. This improves encapsulation and allows these methods to access instance properties like the `disableSuperJsonUnlessRpc` flag.