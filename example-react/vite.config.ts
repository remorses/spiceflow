import { defineConfig } from 'vite'
import { spiceflowPlugin } from 'spiceflow/dist/vite'
import tailwindcss from '@tailwindcss/vite'

import inspect from 'vite-plugin-inspect'

export default defineConfig({
  clearScreen: false,
  plugins: [
    // inspect(),
    tailwindcss(),
    spiceflowPlugin({
      entry: './src/main.tsx',
    }),
  ],
})
