---
'spiceflow': patch
---

Fix React server action error reporting so `onError` runs exactly once for callServer form submission failures. Errors thrown by a server action now still reach the client error boundary, but duplicate `onError` reports from repeated route-handler collection or later passes in the same request are deduped.
