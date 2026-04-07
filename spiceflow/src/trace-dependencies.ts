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
  const rscEntry = path.resolve(outDir, 'rsc/index.js')
  const ssrEntry = path.resolve(outDir, 'ssr/index.js')
  const entries = [rscEntry]
  if (await exists(ssrEntry)) entries.push(ssrEntry)

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
