import { defineConfig } from 'vite'
import { holocron } from '@holocron.so/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    holocron({ entry: './src/server.tsx', pagesDir: './src' }),
    // Cloudflare plugin only for builds — dev mode works without it
    // and it avoids miniflare's node:worker_threads fallback issues
    ...(process.argv.includes('build')
      ? [
          cloudflare({
            viteEnvironment: {
              name: 'rsc',
              childEnvironments: ['ssr'],
            },
          }),
        ]
      : []),
  ],
})
