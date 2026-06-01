---
'spiceflow': patch
---

Fix `.use()` type inference when mounting an `AnySpiceflow` child app. Previously, composing a dynamically-typed child (e.g. from a library that returns `AnySpiceflow`) would collapse the parent's `ClientRoutes` to `any`, breaking `createSpiceflowFetch` type safety for all routes on the composed app. The `.use()` overload now detects when the child's `ClientRoutes` is `any` and returns `this` unchanged, preserving the parent's typed routes.
