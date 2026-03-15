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
        // Build SSR inside RSC directory so wrangler can deploy self-contained dist/rsc
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
