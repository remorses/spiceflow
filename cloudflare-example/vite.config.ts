import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { spiceflowCloudflareViteConfig, spiceflowPlugin } from 'spiceflow/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  ...spiceflowCloudflareViteConfig(),
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
