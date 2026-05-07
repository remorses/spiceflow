---
'spiceflow': patch
---

Fix `createSpiceflowFetch` type inference for overlapping parameterized routes. When a sub-app had routes like `/projects/:id` and `/projects/:pid/environments/:id`, resolved paths returned a union of all matching route response types instead of the specific one. Also fix routes with the same path depth but different HTTP methods (e.g. GET and PUT) returning `unknown`. Additionally, routes with all-optional query schemas no longer force a second argument on the fetch call.
