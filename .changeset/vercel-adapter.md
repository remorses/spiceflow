---
'spiceflow': patch
---

Add automatic Vercel deployment support via Build Output API v3. When `VERCEL=1` is set during build, spiceflow automatically generates the `.vercel/output/` directory with static assets served from CDN and a single Node.js serverless function for SSR/RSC. No configuration needed — just deploy to Vercel and it works. The adapter preserves the same directory structure as the normal Node.js build so `serveStatic` and `.rsc` file resolution work identically. Also exports `spiceflow/vercel` for manual plugin usage.
