---
'spiceflow': patch
---

Fix `router.refresh()` so stale same-location loader data is not returned while a refresh is still in flight, and make each refresh promise resolve or reject for the correct request instead of being completed by an unrelated later commit.
