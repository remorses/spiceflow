# Docker Deployment

The build output is self-contained — `dist/` includes all traced runtime dependencies in `dist/node_modules/`, so you can copy it directly into a Docker image without installing packages at deploy time. The dependency tracing uses `@vercel/nft` to find exactly which files from `node_modules/` are needed at runtime, copying only those into `dist/node_modules/`. This keeps the image small — typically 5-50MB of dependencies instead of hundreds of megabytes. On Vercel and Cloudflare, this step is skipped since those platforms have their own bundling.

The traced `dist/node_modules/` comes from whatever is currently installed in your local `node_modules/` at build time. NFT copies those files directly — no `npm install` runs during the Docker build.

<details>
<summary>Cross-platform native modules</summary>

Package managers only install native modules for your current OS and CPU by default. If you develop on macOS and deploy to Linux (Docker), native packages like `esbuild`, `@swc/core`, or `lightningcss` will be macOS binaries and won't work in the container. You must install dependencies for all platforms **before** running `build`.

Install the Linux native modules before building. Both pnpm and bun `--os`/`--cpu` flags are additive — they keep your current platform and add the target:

```bash
# pnpm
pnpm install --os linux --cpu x64

# bun
bun install --os linux --cpu x64
```

Then run the build:

```bash
pnpm build
```

You can add a convenience script in `package.json` so you don't forget this step:

```jsonc
{
  "scripts": {
    // installs linux native modules alongside current platform, then builds
    "build:docker": "pnpm install --os linux --cpu x64 && pnpm build"
  }
}
```

</details>

Example Dockerfile using `node:24-slim`:

```dockerfile
FROM --platform=linux/amd64 node:24-slim

WORKDIR /app

# IMPORTANT: Before building, install Linux native modules (both flags are
# additive — they keep your current platform and add the target):
#   pnpm install --os linux --cpu x64
#   bun install --os linux --cpu x64

COPY dist/ ./dist/
COPY public/ ./public/

EXPOSE 3000
CMD ["node", "dist/rsc/index.js"]
```

```bash
docker build --platform linux/amd64 -t my-app .
docker run -p 3000:3000 my-app
```
