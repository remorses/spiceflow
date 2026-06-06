import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      formats: ['es'],
      fileName: 'federation-standalone',
    },
    rolldownOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
      ],
    },
  },
})
