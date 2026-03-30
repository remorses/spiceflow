---
'spiceflow': patch
---

Add `publicDir` and `distDir` exports for RSC runtime path resolution. In dev, `publicDir` resolves to `<cwd>/public` and `distDir` to `<cwd>`. In production builds, both resolve relative to `import.meta.filename` so they work correctly on Vercel and other platforms where absolute paths are unpredictable. Available from `spiceflow` and `spiceflow/react`. Example: `import { publicDir } from 'spiceflow'` then `path.join(publicDir, 'images/og.png')`.
