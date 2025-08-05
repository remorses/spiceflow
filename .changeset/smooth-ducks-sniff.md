---
'spiceflow': patch
---

Fix SSE streaming to gracefully handle abort errors without throwing. Previously, when a streaming request was aborted (e.g., user navigates away or cancels the request), the async generator would throw errors like "BodyStreamBuffer was aborted". Now these abort-related errors are caught and the generator simply stops without throwing, making the client more resilient to common abort scenarios.