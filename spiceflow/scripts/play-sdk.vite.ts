import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './scripts/play-sdk.ts',
      formats: ['es'],
      fileName: () => 'play-sdk.js',
    },
  },
})
