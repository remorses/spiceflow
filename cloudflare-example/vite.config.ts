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
        // Dev needs `ssr` on the main Vite process for `loadModuleDevProxy`.
        // Build/preview need a child worker env so `ssr/index.js` is workerd-compatible.
        childEnvironments: command === 'build' ? ['ssr'] : undefined,
      },
    }),
  ],
}))
