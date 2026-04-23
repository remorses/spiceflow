// Separate Vite config for building the MCP App UI into a single HTML file.
// MCP Apps render inside sandboxed iframes via srcdoc, so all JS/CSS must be
// inlined into one self-contained HTML blob. vite-plugin-singlefile handles this.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const INPUT = process.env.INPUT
if (!INPUT) {
  throw new Error('INPUT environment variable is not set')
}

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-mcp-ui',
    rollupOptions: {
      input: INPUT,
    },
  },
})
