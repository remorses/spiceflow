---
'spiceflow': patch
---

Fix Windows support in dependency tracing. Normalize all paths to forward slashes so `indexOf('node_modules')` and path comparisons work correctly with backslash separators. Use junction symlinks on Windows instead of directory symlinks, which require admin privileges or Developer Mode.
