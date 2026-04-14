---
'spiceflow': patch
---

Make `router.refresh()` return a promise so client code can `await router.refresh()` after direct server action calls. The promise resolves after the fresh RSC payload commits, which makes it easier to sequence UI work that depends on updated loader and server component data.
