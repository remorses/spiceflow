---
'spiceflow': patch
---

Support async iterables inside object fields for federated payload decoding, so routes can return values like `{ stream }` and clients can iterate `decoded.stream` with `for await`.
