---
'spiceflow': patch
---

Trace runtime dependencies into `dist/node_modules/` after build using `@vercel/nft`, making the build output self-contained. You can now copy the `dist/` folder into a Docker container and run `node dist/rsc/index.js` without needing the project's `node_modules/`. This is enabled automatically for all Node.js builds and skipped for Vercel and Cloudflare which have their own bundling strategies. The dependency tracing logic is extracted into a shared `trace-dependencies.ts` module used by both the Vercel adapter and the standalone build plugin.
