---
'spiceflow': patch
---

Fix `router.refresh()` so each refresh waits for its own payload commit and stale same-location loader data is not returned while a refresh payload is still in flight. The router now records payload-ready, payload-committed, and payload-failed events so refresh timing is derived from the actual request lifecycle instead of mirrored flags.
