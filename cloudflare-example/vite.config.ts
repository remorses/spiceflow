import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { spiceflowPlugin } from 'spiceflow/vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  environments: {
    ssr: {
      build: {
        // SSR must live inside dist/rsc/ because workerd only bundles files within the
        // Worker's directory. The RSC code loads SSR via import.meta.viteRsc.loadModule
        // which resolves to a relative import "../ssr/index.js" — if SSR is at dist/ssr/
        // (sibling), the Worker can't reach it at runtime.
        outDir: path.join('dist', 'rsc/ssr'),
      },
    },
  },
  clearScreen: false,
  plugins: [
    react(),
    spiceflowPlugin({
      entry: './app/main.tsx',
    }),
    tailwindcss(),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        // Keep dev, preview, and deploy on the same worker child-env shape.
        childEnvironments: ['ssr'],
      },
    }),
  ],
}))
