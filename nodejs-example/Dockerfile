FROM node:24-slim

WORKDIR /app

# IMPORTANT: Before building, install Linux native modules (both flags are
# additive — they keep your current platform and add the target):
#   pnpm install --os linux --cpu x64
#   bun install --os linux --cpu x64

COPY dist/ ./dist/
COPY public/ ./public/

EXPOSE 3000
CMD ["node", "dist/rsc/index.js"]
