---
'spiceflow': patch
---

Fix duplicate base path handling in nested Spiceflow apps. The `joinBasePaths` method now properly handles cases where parent paths are prefixes of child paths, preventing duplicate path segments from being concatenated. This ensures that nested Spiceflow instances with overlapping base paths generate correct URLs.
