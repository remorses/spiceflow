---
'spiceflow': patch
---

Fix federation hosts built with `externalizeShared`. The shared `react` import map module did not export React 19.3's `addTransitionType` and `ViewTransition`, so the page failed to hydrate with `The requested module 'react' does not provide an export named 'addTransitionType'`. The shared `react-dom` and `react-dom/client` modules now also export every runtime export.

Fix a full host page reload when a federated remote has a broken client chunk. The missing client reference recovery now hard-reloads only for the host's own client references (a stale tab after a deploy). A remote module that fails to load renders its static SSR fallback again, without reloading the page. A client module that failed to load is no longer cached as failed: the next require tries again, so recovery works again after its 60-second guard ends.
