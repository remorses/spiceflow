---
'spiceflow': patch
---

Enable federation remotes to work in `vite dev` mode. Client component chunks now keep bare `import "react"` specifiers in dev so federation consumers can resolve them via their import map when loading chunks cross-origin.

The spiceflow plugin automatically configures OXC JSX transform for federation remotes, so `@vitejs/plugin-react` is no longer needed in the remote's vite config. Fast Refresh is disabled since federation chunks are loaded cross-origin where HMR doesn't apply.

```ts
// remote/vite.config.ts — no @vitejs/plugin-react needed
export default defineConfig({
  base: 'http://localhost:3051',
  plugins: [
    spiceflow({
      entry: './src/main.tsx',
      federation: 'remote',
    }),
  ],
})
```
