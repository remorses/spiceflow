import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: './dist-play-sdk',
    lib: {
      entry: './scripts/play-sdk.ts',
      formats: ['es'],

      fileName: () => 'play-sdk.ts',
    },
    rollupOptions: {
      external: ['node-fetch'],
    },
    minify: false,
  },
})
