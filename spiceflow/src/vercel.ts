// Vercel Build Output API v3 adapter for Spiceflow.
// Generates .vercel/output/ directory from the normal Vite build output.
// Activated automatically when VERCEL=1 environment variable is set.
//
// Useful references:
// - Build Output API v3 spec:       https://vercel.com/docs/build-output-api/v3
// - Build Output API primitives:    https://vercel.com/docs/build-output-api/v3/primitives
// - Build Output API configuration: https://vercel.com/docs/build-output-api/v3/configuration
// - @vercel/hono adapter source:    https://github.com/vercel/vercel/tree/main/packages/hono/src
// - SvelteKit adapter-vercel:       https://github.com/sveltejs/kit/tree/main/packages/adapter-vercel
import {
  copyFileSync,
  mkdirSync,
  realpathSync,
  statSync,
  symlinkSync,
} from 'node:fs'
import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { nodeFileTrace } from '@vercel/nft'
import type { Plugin } from 'vite'

interface VercelConfig {
  version: 3
  routes?: VercelRoute[]
  overrides?: Record<string, { path?: string; contentType?: string }>
  cache?: string[]
  framework?: { slug: string; version?: string }
}

type VercelRoute = VercelSourceRoute | VercelHandlerRoute

interface VercelSourceRoute {
  src: string
  dest?: string
  headers?: Record<string, string>
  methods?: string[]
  continue?: boolean
  check?: boolean
  status?: number
}

interface VercelHandlerRoute {
  handle: 'filesystem' | 'rewrite' | 'resource' | 'miss' | 'hit' | 'error'
  src?: string
  dest?: string
  status?: number
}

interface VercelFunctionConfig {
  runtime: string
  handler: string
  launcherType?: 'Nodejs'
  memory?: number
  maxDuration?: number
  regions?: string[]
  supportsResponseStreaming?: boolean
  environment?: Record<string, string>
}

export function vercelPlugin(): Plugin[] {
  let outDir = 'dist'
  let root = process.cwd()
  let spiceflowVersion: string | undefined

  return [
    {
      name: 'spiceflow:vercel',
      apply: 'build',

      configResolved(config) {
        outDir = config.build.outDir
        root = config.root
        try {
          const require = createRequire(import.meta.url)
          const pkg = require('spiceflow/package.json')
          spiceflowVersion = pkg.version
        } catch {
          // ignore — version is optional metadata
        }
      },

      // buildApp with order:"post" runs once after ALL environments finish
      // building (including prerendering). This avoids the per-environment
      // closeBundle issue.
      buildApp: {
        order: 'post' as const,
        async handler() {
          await generateVercelOutput({ outDir, root, spiceflowVersion })
        },
      },
    },
  ]
}

async function generateVercelOutput({
  outDir,
  root,
  spiceflowVersion,
}: {
  outDir: string
  root: string
  spiceflowVersion: string | undefined
}) {
  console.log('\n[spiceflow] Generating Vercel Build Output...')

  const vercelOut = path.resolve(root, '.vercel/output')
  const staticDir = path.join(vercelOut, 'static')
  const funcDir = path.join(vercelOut, 'functions/index.func')

  const clientDir = path.resolve(outDir, 'client')
  const rscDir = path.resolve(outDir, 'rsc')
  const ssrDir = path.resolve(outDir, 'ssr')

  // Clean and recreate output directories
  await rm(vercelOut, { recursive: true, force: true })
  await mkdir(staticDir, { recursive: true })
  await mkdir(funcDir, { recursive: true })

  // 1. Copy client assets to static (served by Vercel CDN)
  await cp(clientDir, staticDir, { recursive: true })

  // 2. Copy user's public/ directory to static (if it exists)
  const publicDir = path.resolve(root, 'public')
  if (await exists(publicDir)) {
    await cp(publicDir, staticDir, { recursive: true })
  }

  // 3. Copy server bundles into the function directory.
  //    Preserve the same relative structure so import.meta.filename
  //    based path resolution works identically to the normal Node build.
  await cp(rscDir, path.join(funcDir, 'rsc'), { recursive: true })
  await cp(ssrDir, path.join(funcDir, 'ssr'), { recursive: true })

  // 4. Copy client assets inside the function too, so serveStatic
  //    can find .rsc files and other assets at the expected relative path.
  //    The auto-injected serveStatic resolves: dirname(import.meta.filename) + '../client'
  //    which from funcDir/rsc/index.js = funcDir/client/
  await cp(clientDir, path.join(funcDir, 'client'), { recursive: true })

  // 5. Trace and copy externalized node_modules dependencies.
  //    Vite externalizes node packages by default in RSC/SSR builds. These
  //    imports remain as bare specifiers (e.g. import "@upstash/redis") and
  //    need node_modules available at runtime. We use @vercel/nft to find
  //    exactly which files are needed and copy only those into the function.
  await traceAndCopyDependencies(outDir, funcDir)

  // 6. Write package.json so Node.js treats .js files as ESM inside the function
  await writeFile(
    path.join(funcDir, 'package.json'),
    JSON.stringify({ type: 'module' }),
  )

  // 7. Write function config
  const funcConfig: VercelFunctionConfig = {
    runtime: 'nodejs22.x',
    handler: 'rsc/index.js',
    launcherType: 'Nodejs',
    supportsResponseStreaming: true,
  }
  await writeFile(
    path.join(funcDir, '.vc-config.json'),
    JSON.stringify(funcConfig, null, 2),
  )

  // 8. Write deployment config
  const config: VercelConfig = {
    version: 3,
    routes: [
      // Vite hashed assets are immutable — cache forever at the edge
      {
        src: '/assets/.+',
        headers: { 'cache-control': 'public, immutable, max-age=31536000' },
        continue: true,
      },
      // Serve static files from CDN first
      { handle: 'filesystem' as const },
      // Everything else goes to the server function
      { src: '/(.*)', dest: '/' },
    ],
    framework: {
      slug: 'spiceflow',
      version: spiceflowVersion,
    },
  }
  await writeFile(
    path.join(vercelOut, 'config.json'),
    JSON.stringify(config, null, 2),
  )

  console.log('[spiceflow] Vercel Build Output generated at .vercel/output/')
}

// Trace externalized node_modules from the server bundles using @vercel/nft,
// then copy only the files that are actually needed into the function directory.
// Follows the same approach as SvelteKit's adapter-vercel: use filesystem root
// as base, compute common ancestor, recreate pnpm symlinks with realpathSync.
async function traceAndCopyDependencies(
  outDir: string,
  funcDir: string,
) {
  const rscEntry = path.resolve(outDir, 'rsc/index.js')
  const ssrEntry = path.resolve(outDir, 'ssr/index.js')
  const entries = [rscEntry]
  if (await exists(ssrEntry)) entries.push(ssrEntry)

  // Use filesystem root as base (same as SvelteKit) so all traced paths
  // are absolute-relative, giving us full control over path manipulation.
  let base = rscEntry
  while (base !== (base = path.dirname(base)));

  const { fileList } = await nodeFileTrace(entries, { base })

  const nmFiles = [...fileList].filter((f) => f.includes('node_modules'))
  if (nmFiles.length === 0) return

  // The project root is the parent of outDir (e.g. integration-tests/).
  // At runtime the handler lives at funcDir/rsc/index.js. Node.js module
  // resolution walks up from there and looks for funcDir/node_modules/.
  // So all traced node_modules paths must land under funcDir/node_modules/.
  //
  // For pnpm workspaces, files live in two places:
  //   1. project/node_modules/@foo/bar (symlink) — relative to project root
  //   2. workspace-root/node_modules/.pnpm/... (real files) — outside project root
  //
  // We handle both by extracting the path starting from the first
  // "node_modules" segment, which works regardless of where the file
  // physically lives.
  let copied = 0
  for (const file of nmFiles) {
    const source = base + file

    // Extract path from the first "node_modules" segment onwards.
    // e.g. "/abs/workspace/node_modules/.pnpm/foo/index.js" -> "node_modules/.pnpm/foo/index.js"
    const nmIdx = source.indexOf('node_modules')
    if (nmIdx === -1) continue
    const relFromNm = source.slice(nmIdx)
    const dest = path.join(funcDir, relFromNm)

    const stats = statSync(source, { throwIfNoEntry: false })
    if (!stats) continue
    const isDir = stats.isDirectory()

    const realpath = realpathSync(source)

    mkdirSync(path.dirname(dest), { recursive: true })

    if (source !== realpath) {
      // It's a symlink (common with pnpm) — recreate as a relative symlink
      // so Node.js module resolution works correctly at runtime.
      const realNmIdx = realpath.indexOf('node_modules')
      if (realNmIdx === -1) continue
      const realdest = path.join(funcDir, realpath.slice(realNmIdx))
      mkdirSync(path.dirname(realdest), { recursive: true })
      try {
        symlinkSync(
          path.relative(path.dirname(dest), realdest),
          dest,
          isDir ? 'dir' : 'file',
        )
      } catch {
        // symlink already exists
      }
    } else if (!isDir) {
      copyFileSync(source, dest)
    }
    copied++
  }

  if (copied > 0) {
    console.log(
      `[spiceflow] Traced and copied ${copied} dependency files into function`,
    )
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}
