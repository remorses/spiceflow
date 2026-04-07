---
'spiceflow': patch
---

Fix standalone dependency tracing for packages that load platform-specific runtime files through `optionalDependencies`, and add regression coverage that verifies a built standalone server can render a Takumi image route from an isolated `dist/` copy.
