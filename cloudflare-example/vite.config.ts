import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { spiceflowCloudflareViteConfig, spiceflowPlugin } from 'spiceflow/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
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
        // In dev, keep `ssr` on the main Vite process so `loadModuleDevProxy`
        // can bridge from the worker RSC environment into Node SSR.
        // In build/preview, emit `ssr` as a worker child environment so the
        // generated `ssr/index.js` stays workerd-compatible.
        childEnvironments: command === 'build' ? ['ssr'] : undefined,
      },
    }),
  ],
}))
