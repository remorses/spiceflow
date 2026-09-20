---
'spiceflow': patch
---

restructure documentation: the README is now a concise entry point with an overview of how spiceflow apps work, the capability list, and a documentation map linking each feature to its own docs page on getspiceflow.com. The detailed routing, middleware, streaming, server runtime, pages, layouts, client components, loaders, forms, error handling, and navigation sections moved to dedicated pages under `website/src/api/` and `website/src/react/`, each also available as raw markdown by appending `.md` to the page URL. The spiceflow skill was rewritten as a pointer router that tells agents which doc to fetch per task instead of requiring a full README read.
