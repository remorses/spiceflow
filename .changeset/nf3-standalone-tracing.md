---
'spiceflow': patch
---

Switch standalone dependency tracing to `nf3` so native runtime packages resolve from the built output without relying on pnpm-specific layout details, and update the Takumi regression to assert standalone runtime resolution instead of exact copied paths.
