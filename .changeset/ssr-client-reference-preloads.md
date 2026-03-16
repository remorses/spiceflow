---
'spiceflow': patch
---

Fix SSR client reference resource hints by moving the Flight deserialization used for server rendering back inside the React DOM SSR render context. This restores client-reference stylesheet and preload injection during document rendering, so pages with client components hydrate with the expected early resource hints.
