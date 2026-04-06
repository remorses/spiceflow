---
'spiceflow': patch
---

Run `pnpm tsc` before `pnpm test` in the `spiceflow` package so test runs rebuild `dist/` automatically. The package build cleanup now uses `rimraf` instead of shell-dependent globs, which avoids failures when `dist/` or `*.tsbuildinfo` do not exist yet.
