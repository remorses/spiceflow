// Trace externalized npm dependencies from Vite server bundles using nf3,
// then copy the runtime-only node_modules subset into the standalone output.
import { access } from 'node:fs/promises'
import path from 'node:path'
import { traceNodeModules } from 'nf3'

export async function traceAndCopyDependencies({
  outDir,
  rootDir,
  targetDir,
}: {
  outDir: string
  rootDir: string
  targetDir: string
}) {
  const rscEntry = await resolveBuiltEntry(path.resolve(outDir, 'rsc'))
  const ssrEntry = await resolveBuiltEntry(path.resolve(outDir, 'ssr'), true)
  const entries = [rscEntry]
  if (ssrEntry) entries.push(ssrEntry)

  await traceNodeModules(entries, {
    outDir: targetDir,
    rootDir,
    writePackageJson: false,
  })

  console.log(
    `[spiceflow] Traced standalone dependencies into ${path.join(targetDir, 'node_modules')}`,
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
