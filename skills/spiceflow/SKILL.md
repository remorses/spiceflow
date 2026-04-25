---
name: spiceflow
description: 'Spiceflow is a super simple, fast, and type-safe API and React Server Components framework for TypeScript. Works on Node.js, Bun, and Cloudflare Workers. Use this skill whenever working with spiceflow to get the latest docs and API reference.'
---

# Spiceflow

Every time you work with spiceflow, you MUST fetch the latest README from the main branch. If that README references relevant subdocuments, you MUST fetch those too:

```bash
curl -s https://raw.githubusercontent.com/remorses/spiceflow/main/README.md # NEVER pipe to head/tail, read the full output

# Always read the typed fetch client doc when using createSpiceflowFetch
curl -s https://raw.githubusercontent.com/remorses/spiceflow/main/docs/fetch-client.md
```

NEVER use `head`, `tail`, or any other command to truncate the output. Read the full README every time, then read any referenced subdocuments that are relevant to the task. They contain API details, examples, and framework conventions that are easy to miss if you only read the top-level README.

## Typed fetch client rules

When using the typed fetch client (`createSpiceflowFetch`), follow these rules:

- **Use `:param` paths with a `params` object.** Never interpolate IDs into the path string. `` `/users/${id}` `` is just `string` and breaks all type inference.
- **All packages in a monorepo must use the exact same spiceflow version.** Mismatched versions cause `Types have separate declarations of a private property` errors. Use `pnpm update -r spiceflow` (without `--latest`) to sync.
- **Across workspaces, import API types from built `dist/*.d.ts` files, not source files.** This prevents TypeScript from walking into unrelated runtime code like worker-only imports, CSS, raw assets, or framework-specific globals during typechecking.
- **Use `import type` for cross-workspace API types.** Never value-import the server app just to get fetch client typing.
- **Prefer keeping the server package as a `devDependency` of the client package** when the server package is private and only used for typechecking. For example, a publishable CLI can keep a private website package in `devDependencies` and import only `type App` from the website's built `dist` declarations.
- **Make sure the server package exports its `dist` declarations** and that its `build` script emits them before consumers typecheck. If the client imports `dist/src/app.d.ts`, the server package must actually produce that file.
- **Route handlers must return plain objects** for the response type to be inferred. Returning `res.json()` or `Response.json()` erases the type to `any`.
- **Never `return new Response(...)`.** It erases the body type. Use `return json(...)` (preserves type and status) or `throw` anything (`throw new Response(...)` is fine since throws don't affect return type).
- **`body` is a plain object**, not `JSON.stringify()`. The client serializes it automatically.
- **Response is `Error | Data`.** Check with `instanceof Error`, then the happy path has the narrowed type.
