---
'spiceflow': patch
---

Fix federated RSC streaming cleanup so canceled or failed decodes stop reading the underlying SSE and Flight streams promptly. This prevents stalled readers from hanging around after browser-side decode failures and keeps streamed federation responses responsive to aborts.
