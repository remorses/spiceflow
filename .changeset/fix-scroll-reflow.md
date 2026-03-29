---
'spiceflow': patch
---

Fix forced reflow caused by synchronous `window.scrollY` reads in the router. The router now caches the scroll position via a passive scroll event listener and reads from the cache instead, avoiding layout thrashing during RSC payload processing and navigation commits.
