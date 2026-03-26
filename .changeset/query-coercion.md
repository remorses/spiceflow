---
'spiceflow': minor
---

Automatically coerce query parameters to match the schema type. Query params are always strings from the URL, but now `z.number()`, `z.boolean()`, and `z.array(z.string())` work directly without needing `z.coerce.number()` or `z.preprocess()`. Single query values are automatically wrapped into arrays when the schema expects `z.array()`, and string values are coerced to numbers or booleans when the schema declares those types. Uses Standard Schema's JSON Schema converter, so this works with any schema library (Zod, Valibot, ArkType).

```ts
query: z.object({
  page: z.number().optional(),     // "42" → 42 automatically
  active: z.boolean().optional(),  // "true" → true automatically
  tag: z.array(z.string()),        // "react" → ["react"] automatically
})
```
