FROM node:24-slim

WORKDIR /app

# The build step uses Node File Tracing (NFT) to copy only the needed files
# from your local node_modules/ into dist/node_modules/. No npm install runs
# here — the image just uses whatever was traced at build time.
#
# IMPORTANT: Package managers only install native modules for your current OS
# and CPU by default. If you build on macOS, native packages like `esbuild` or
# `@swc/core` will be macOS binaries — they won't work on Linux inside Docker.
# Before running `build`, install dependencies for all platforms:
#
#   pnpm:  pnpm install --os linux --cpu x64
#   bun:   bun install --os linux --cpu x64
#
# Then run the build as usual (e.g. pnpm build).

COPY dist/ ./dist/
COPY public/ ./public/

EXPOSE 3000
CMD ["node", "dist/rsc/index.js"]
