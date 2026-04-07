---
'spiceflow': patch
---

Fix federated payload streaming cleanup so cancelling a streamed decode now propagates through both the SSE wrapper and the underlying Flight stream, and add streaming-safe SSE headers so chunked federation responses flush incrementally instead of being buffered by intermediaries.
