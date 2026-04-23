---
'spiceflow': patch
---

Make the exported `redirect()` helper type-safe when `SpiceflowRegister` is set, so route literals are validated and `params` are required for parameterized paths like `redirect('/users/:id', { params: { id: '42' } })`. Keep handler context `redirect` broadly typed to avoid circular app type inference during route declaration.
