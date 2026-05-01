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
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Logger, Plugin } from 'vite'
import { colors } from './colors.js'
import {
  exists,
  formatDuration,
  formatSpiceflowStep,
  traceAndCopyDependencies,
} from './trace-dependencies.js'

interface VercelConfig {
  version: 3
  routes?: VercelRoute[]
  overrides?: Record<string, { path?: string; contentType?: string }>
  cache?: string[]
  trailingSlash?: boolean
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
  let base = ''
  let assetsDir = 'assets'
  let publicDir = 'public'
  let spiceflowVersion: string | undefined
  let logger: Logger

  return [
    {
      name: 'spiceflow:vercel',
      apply: 'build',

      configResolved(config) {
        logger = config.logger
        outDir = path.resolve(config.root, config.build.outDir)
        root = config.root
        base = config.base?.replace(/\/$/, '') ?? ''
        assetsDir = config.build.assetsDir ?? 'assets'
        publicDir = config.publicDir
          ? path.relative(config.root, config.publicDir)
          : 'public'
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
          await generateVercelOutput({
            outDir,
            root,
            base,
            assetsDir,
            publicDir,
            spiceflowVersion,
            logger,
          })
        },
      },
    },
  ]
}

async function generateVercelOutput({
  outDir,
  root,
  base,
  assetsDir,
  publicDir,
  spiceflowVersion,
  logger,
}: {
  outDir: string
  root: string
  base: string
  assetsDir: string
  publicDir: string
  spiceflowVersion: string | undefined
  logger: Logger
}) {
  const start = performance.now()
  logger.info(formatSpiceflowStep({ message: 'generating Vercel build output...' }))

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

  // 2. Copy user's public directory to static (if it exists).
  //    Vite already copies publicDir contents into dist/client/ during build,
  //    but we also copy the source dir in case Vite's copy was filtered.
  const resolvedPublicDir = path.resolve(root, publicDir)
  if (await exists(resolvedPublicDir)) {
    await cp(resolvedPublicDir, staticDir, { recursive: true })
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
  //    need node_modules available at runtime. nf3 traces the built server
  //    entries and copies only the runtime-required files into the function.
  await traceAndCopyDependencies({
    logger,
    outDir,
    rootDir: root,
    targetDir: funcDir,
  })

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
    trailingSlash: false,
    routes: [
      // Vite hashed assets are immutable — cache forever at the edge.
      // Uses base path + assetsDir from Vite resolved config.
      {
        src: `${base}/${assetsDir}/.+`,
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

  logger.info(
    `${formatSpiceflowStep({
      icon: colors.green('✓'),
      message: `generated Vercel build output in ${formatDuration(performance.now() - start)}`,
    })}\n  ${colors.dim('output: .vercel/output')}`,
  )
}
