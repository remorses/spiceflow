import { defineConfig } from 'vite'
import { spiceflowPlugin } from 'spiceflow/dist/vite'

export default defineConfig({
  clearScreen: false,
  plugins: [
    spiceflowPlugin({
      entry: './src/main.tsx',
    }),
  ],
})
