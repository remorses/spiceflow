---
'spiceflow': patch
---

Fix "ReadableStream has been locked to a reader" error when calling `getActionRequest()` inside server actions and reading the request body or forwarding the request to another handler (e.g. an auth session check). Spiceflow now stores a bodiless clone of the request in the action context since the original body is already consumed to decode action arguments.
