---
'spiceflow': patch
---

Add `parseFormData` and `parseFormDataAsync` utilities for type-safe form validation. Works with any Standard Schema library (Zod, Valibot, ArkType). Automatically coerces string form values to numbers/booleans based on the schema, and uses `formData.getAll()` for fields declared as arrays. Pair with `schema.keyof().enum` for type-safe input `name` attributes that catch typos at compile time.
