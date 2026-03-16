import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { spiceflowPlugin } from 'spiceflow/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
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
  // Pre-bundle deps that Vite discovers at runtime during dev. Without this,
  // fresh installs (CI) trigger multiple dep optimization rounds + program
  // reloads that cause dual React copies in SSR, crashing with
  // "Invalid hook call" from RemoveDuplicateServerCss.
  environments: {
    rsc: {
      optimizeDeps: {
        include: ['copy-anything', 'superjson', 'zod', 'history'],
      },
    },
    ssr: {
      optimizeDeps: {
        include: ['isbot', 'history', 'react-dom/server'],
      },
    },
  },
}))
