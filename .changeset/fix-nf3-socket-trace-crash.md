---
'spiceflow': patch
---

Fix standalone trace crash when Unix domain socket files exist in traced paths (e.g. Playwright/Chromium `SingletonSocket` in `/tmp/`). The custom `safeReadFile` now returns an empty string instead of `null` for non-regular files, which prevents `@vercel/nft`'s `emitDependency` from throwing "File does not exist" and killing the entire trace. An empty string just produces zero deps from the analyzer, which is correct for sockets and FIFOs.
