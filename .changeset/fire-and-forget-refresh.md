---
'spiceflow': patch
---

Keep `router.refresh()` as a fire-and-forget API, remove the stale awaitable type expectation from tests, and document that awaitable navigation or refresh commit helpers must not be used inside React client form actions because they can deadlock the page.
