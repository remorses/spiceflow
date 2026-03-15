import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { spiceflowPlugin } from 'spiceflow/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  build: {
    rollupOptions: {
      external: [/^cloudflare:/],
    },
  },
  environments: {
    ssr: {
      build: {
        // SSR must live inside dist/rsc/ because workerd only bundles files within the
        // Worker's directory. The RSC code loads SSR via import.meta.viteRsc.loadModule
        // which resolves to a relative import "../ssr/index.js" — if SSR is at dist/ssr/
        // (sibling), the Worker can't reach it at runtime.
        outDir: './dist/rsc/ssr',
      },
    },
  },
  plugins: [
    react(),
    spiceflowPlugin({
      entry: './app/main.tsx',
    }),
    tailwindcss(),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
})
