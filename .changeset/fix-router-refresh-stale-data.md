---
'spiceflow': patch
---

Fix `router.refresh()` returning stale server data after a server action mutates state. RSC flight responses now include `Cache-Control: no-store` and the client fetch uses `cache: 'no-store'` to prevent the browser from serving cached flight payloads instead of making a fresh server request.
