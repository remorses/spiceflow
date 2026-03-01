---
'spiceflow': patch
---

Clean up leftover React Server Components migration artifacts by removing unused framework-only types and stale exports, and harden the new `@vitejs/plugin-rsc` flow. This update ensures server redirects emit a correct `content-type` header, removes dead exports like `RscHandlerResult`, and makes client action refresh handling safer by setting payload updates before awaiting action results.
