---
'spiceflow': patch
---

fix `<Head.Link>` deduplication collapsing `rel="icon"` (and other deduped link rels) with different `media` attributes into a single tag. The dedup key for link tags in `getProcessedHeadTagElements` did not include `media`, so two icons like `<link rel="icon" media="(prefers-color-scheme: light)" ...>` and `<link rel="icon" media="(prefers-color-scheme: dark)" ...>` were keyed identically and only the last one was emitted. The key now includes `media` so color-scheme-aware favicons and media-scoped alternates are preserved.
