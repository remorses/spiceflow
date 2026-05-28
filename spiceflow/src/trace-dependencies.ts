// Trace externalized npm dependencies from Vite server bundles using nf3,
// then copy the runtime-only node_modules subset into the standalone output.
import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { traceNodeModules } from 'nf3'
import { formatDuration, logger } from './logger.js'

export async function traceAndCopyDependencies({
  outDir,
  rootDir,
  targetDir,
}: {
  outDir: string
  rootDir: string
  targetDir: string
}) {
  logger.info('tracing standalone dependencies...')

  const rscEntry = await resolveBuiltEntry(path.resolve(outDir, 'rsc'))
  const ssrEntry = await resolveBuiltEntry(path.resolve(outDir, 'ssr'), true)
  const entries = [rscEntry]
  if (ssrEntry) entries.push(ssrEntry)

  const start = performance.now()
  await traceNodeModules(entries, {
    outDir: targetDir,
    rootDir,
    writePackageJson: false,
    nft: {
      // nf3/nft calls readFile on every traced path including Unix domain sockets
      // (e.g. Playwright Chromium SingletonSocket in /tmp/). Reading a socket throws
      // "Unknown system error -102". Return null for non-regular files to skip them.
      // https://github.com/unjs/nf3/issues/44
      readFile: safeReadFile,
    },
    hooks: {
      traceResult: pruneMissingTraceReasons,
    },
  })

  const nodeModulesPath = path.relative(rootDir, path.join(targetDir, 'node_modules'))
  logger.success(
    `nf3 traced standalone dependencies in ${formatDuration(performance.now() - start)}`,
    `standalone deps: ${nodeModulesPath}`,
  )
}

async function safeReadFile(path: string): Promise<Buffer | null> {
  try {
    const s = await stat(path)
    if (!s.isFile()) return null
    return await readFile(path)
  } catch {
    return null
  }
}

// TODO: remove this workaround once https://github.com/unjs/nf3/pull/43 is merged
export async function pruneMissingTraceReasons(result: {
  reasons: Map<string, { ignored?: boolean; parents: Set<string> }>
}) {
  const existingPaths = new Map<string, boolean>()

  for (const [p, reason] of result.reasons) {
    if (!reason.ignored && !(await tracePathExists(p, existingPaths))) {
      result.reasons.delete(p)
      continue
    }

    for (const parent of reason.parents) {
      if (!(await tracePathExists(parent, existingPaths))) {
        reason.parents.delete(parent)
      }
    }
  }
}

async function tracePathExists(p: string, cache: Map<string, boolean>) {
  const fullPath = path.resolve('/', p)
  const cached = cache.get(fullPath)
  if (cached !== undefined) return cached

  const exists = await realpathExists(fullPath)
  cache.set(fullPath, exists)
  return exists
}

async function realpathExists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function resolveBuiltEntry(dir: string): Promise<string>
export async function resolveBuiltEntry(dir: string, optional: true): Promise<string | undefined>
export async function resolveBuiltEntry(
  dir: string,
  optional = false,
): Promise<string | undefined> {
  for (const ext of ['js', 'mjs']) {
    const entry = path.resolve(dir, `index.${ext}`)
    if (await exists(entry)) return entry
  }

  if (optional) return undefined

  throw new Error(
    `[spiceflow] Expected a built server entry at ${path.join(dir, 'index.{js,mjs}')}`,
  )
}
