import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import spiceflow from 'spiceflow/vite'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  clearScreen: false,
  plugins: [
    react(),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
    spiceflow({
      entry: './src/main.tsx',
    }),
  ],
}))
