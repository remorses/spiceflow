---
'spiceflow': patch
---

Fix standalone trace crash when Unix domain socket files exist in traced paths (e.g. Playwright/Chromium `SingletonSocket` in `/tmp/`). The nf3 tracer calls `readFile()` on every discovered path, but socket files cause `Unknown system error -102`. Pass a custom `readFile` that checks `stat.isFile()` before reading, returning `null` for non-regular files.
