---
'spiceflow': patch
---

fix `Head.Title` and `Head.Meta` rendering in RSC apps so metadata is emitted in the document head and stays available after hydration. This also keeps duplicate tags inside a single `Head` subtree deduplicated, matching the expected behavior for layouts and pages.
