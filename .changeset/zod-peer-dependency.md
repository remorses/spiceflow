---
'spiceflow': patch
---

Move zod from regular dependency to peer dependency. This ensures the user's zod instance is the same one spiceflow uses internally, fixing potential `instanceof` check failures when npm/pnpm installs a duplicate copy. Users already install zod separately (`npm install spiceflow zod`), so this is a non-breaking change.
