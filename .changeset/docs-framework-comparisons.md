---
'spiceflow': patch
---

Move framework comparisons out of the README onto a dedicated docs page covering Next.js App Router, Hono, and Elysia. The page stresses that Spiceflow is a full React RSC framework, not only an API layer: no file-based page routing, typed `router.href()`, and a request model where every GET re-runs matching layouts with no App Router cache or render-mode constraints.
