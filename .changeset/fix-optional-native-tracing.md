---
'spiceflow': patch
---

Fix standalone production builds when optional native packages are referenced by a dependency but are not installed for the current platform. Spiceflow now prunes missing trace entries before copying `node_modules`, so apps that depend on packages with platform-specific optional binaries can build successfully.
