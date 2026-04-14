---
'spiceflow': patch
---

Route server action failures through `onError()` and gate the extra RSC and SSR render debug logs behind `SPICEFLOW_VERBOSE=1` instead of a test-only quiet flag. This keeps normal test and app output cleaner while preserving an opt-in path for low-level render debugging.
