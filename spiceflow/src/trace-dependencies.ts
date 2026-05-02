// Trace externalized npm dependencies from Vite server bundles using nf3,
// then copy the runtime-only node_modules subset into the standalone output.
import { access } from 'node:fs/promises'
import path from 'node:path'
import { traceNodeModules } from 'nf3'
import type { Logger } from 'vite'
import { colors } from './colors.js'

export function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2).replace(/\.0+$|0+$/g, '')}s`
}

export function formatSpiceflowStep({
  icon = colors.cyan('■'),
  message,
}: {
  icon?: string
  message: string
}) {
  return `${icon} ${colors.cyan('spiceflow')} ${message}`
}

export async function traceAndCopyDependencies({
  logger = console,
  outDir,
  rootDir,
  targetDir,
}: {
  logger?: Pick<Logger, 'info'>
  outDir: string
  rootDir: string
  targetDir: string
}) {
  logger.info(formatSpiceflowStep({ message: 'tracing standalone dependencies...' }))

  const rscEntry = await resolveBuiltEntry(path.resolve(outDir, 'rsc'))
  const ssrEntry = await resolveBuiltEntry(path.resolve(outDir, 'ssr'), true)
  const entries = [rscEntry]
  if (ssrEntry) entries.push(ssrEntry)

  const start = performance.now()
  await traceNodeModules(entries, {
    outDir: targetDir,
    rootDir,
    writePackageJson: false,
  })

  const nodeModulesPath = path.relative(rootDir, path.join(targetDir, 'node_modules'))
  logger.info(
    `${formatSpiceflowStep({
      icon: colors.green('✓'),
      message: `nf3 traced standalone dependencies in ${formatDuration(performance.now() - start)}`,
    })}\n  ${colors.dim(`standalone deps: ${nodeModulesPath}`)}`,
  )
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
