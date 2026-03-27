// Trace externalized npm dependencies from Vite server bundles using @vercel/nft,
// then copy only the files that are actually needed into a target directory.
//
// Follows the same approach as SvelteKit's adapter-vercel: use filesystem root
// as base, compute common ancestor, recreate pnpm symlinks with realpathSync.
//
// Workspace dependencies (pnpm workspace:^ links) are NOT a concern here:
// Vite does not externalize linked/workspace packages in SSR/RSC builds — it
// bundles them into the output. Only real npm packages from node_modules/.pnpm/
// remain as bare specifiers in the build output and need tracing at runtime.
import {
  copyFileSync,
  mkdirSync,
  realpathSync,
  statSync,
  symlinkSync,
} from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { nodeFileTrace } from '@vercel/nft'

export async function traceAndCopyDependencies(
  outDir: string,
  targetDir: string,
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

  // At runtime the handler lives at targetDir/rsc/index.js. Node.js module
  // resolution walks up from there and looks for targetDir/node_modules/.
  // So all traced node_modules paths must land under targetDir/node_modules/.
  //
  // For pnpm workspaces, npm deps live in two places:
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
    const dest = path.join(targetDir, relFromNm)

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
      const realdest = path.join(targetDir, realpath.slice(realNmIdx))
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
      `[spiceflow] Traced and copied ${copied} dependency files into output`,
    )
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
