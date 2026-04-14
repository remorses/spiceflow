---
'spiceflow': patch
---

Add a dedicated `docs/openapi.md` guide covering status-code response maps, centralized error responses with `onError`, sharing Zod schemas across routes, hiding routes from the document, writing markdown descriptions with `string-dedent`, generating a local `openapi.json` file from a script, and preserving fetch client type safety by throwing `Response` objects for non-2xx cases. The root `README.md` OpenAPI section now links to this new document.
