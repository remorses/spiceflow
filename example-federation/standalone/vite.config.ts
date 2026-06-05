import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federationPatchWebpack } from 'spiceflow/federation-client'

export default defineConfig({
  clearScreen: false,
  plugins: [react(), federationPatchWebpack()],
  build: {
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
