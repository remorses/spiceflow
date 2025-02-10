import { defineConfig } from 'vite'
import { spiceflowPlugin } from 'spiceflow/dist/vite'
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  clearScreen: false,
  plugins: [
    // inspect(),
    spiceflowPlugin({
      entry: './src/main.tsx',
    }),
  ],
})
