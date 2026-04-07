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
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  symlinkSync,
} from 'node:fs'
import { access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { nodeFileTrace } from '@vercel/nft'

const isWin = process.platform === 'win32'
const require = createRequire(import.meta.url)

// Normalize backslashes to forward slashes so path comparisons and
// indexOf('node_modules') work consistently on Windows.
function toSlash(p: string): string {
  return isWin ? p.replace(/\\/g, '/') : p
}

type PackageJson = {
  optionalDependencies?: Record<string, string>
}

function getNodeModulesRelativePath(source: string): string | null {
  const nmIdx = source.indexOf('node_modules')
  if (nmIdx === -1) return null
  return source.slice(nmIdx)
}

function getPackageRoot(source: string): string | null {
  const marker = '/node_modules/'
  const lastNodeModulesIdx = source.lastIndexOf(marker)
  if (lastNodeModulesIdx === -1) return null

  const packagePath = source.slice(lastNodeModulesIdx + marker.length)
  const [first, second] = packagePath.split('/')
  if (!first || first === '.pnpm') return null

  const packageName = first.startsWith('@') ? second && `${first}/${second}` : first
  if (!packageName) return null

  return source.slice(0, lastNodeModulesIdx + marker.length + packageName.length)
}

function listPackageFiles(packageRoot: string): string[] {
  const files: string[] = []
  const queue = [packageRoot]

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) continue

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = toSlash(path.join(current, entry.name))
      if (entry.isDirectory()) {
        queue.push(entryPath)
        continue
      }
      files.push(entryPath)
    }
  }

  return files
}

function readPackageJson(packageRoot: string): PackageJson | null {
  try {
    return JSON.parse(
      readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
    ) as PackageJson
  } catch {
    return null
  }
}

function collectOptionalDependencyFiles(packageRoots: Set<string>): Set<string> {
  const optionalPackageRoots = new Set<string>()

  for (const packageRoot of packageRoots) {
    const packageJson = readPackageJson(packageRoot)
    const optionalDeps = packageJson?.optionalDependencies
    if (!optionalDeps) continue

    for (const dependency of Object.keys(optionalDeps)) {
      try {
        const resolved = toSlash(require.resolve(dependency, { paths: [packageRoot] }))
        const dependencyRoot = getPackageRoot(resolved)
        if (dependencyRoot) optionalPackageRoots.add(dependencyRoot)
      } catch {
        // Optional deps are platform-specific by design, so unresolved ones are fine.
      }
    }
  }

  return new Set(
    [...optionalPackageRoots].flatMap((packageRoot) => listPackageFiles(packageRoot)),
  )
}

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
  // Normalize to forward slashes so base + file (nft uses '/') is consistent.
  let base = toSlash(rscEntry)
  while (base !== (base = toSlash(path.dirname(base))));

  const { fileList } = await nodeFileTrace(entries, { base })

  const tracedNodeModuleFiles = new Set(
    [...fileList]
      .filter((file) => file.includes('node_modules'))
      .map((file) => toSlash(base + file)),
  )
  if (tracedNodeModuleFiles.size === 0) return

  const tracedPackageRoots = new Set(
    [...tracedNodeModuleFiles]
      .map((file) => getPackageRoot(file))
      .filter((file): file is string => Boolean(file)),
  )
  const optionalDependencyFiles = collectOptionalDependencyFiles(tracedPackageRoots)
  const filesToCopy = new Set([
    ...tracedNodeModuleFiles,
    ...optionalDependencyFiles,
  ])

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
  for (const source of filesToCopy) {
    // Extract path from the first "node_modules" segment onwards.
    // e.g. "/abs/workspace/node_modules/.pnpm/foo/index.js" -> "node_modules/.pnpm/foo/index.js"
    const relFromNm = getNodeModulesRelativePath(source)
    if (!relFromNm) continue
    const dest = path.join(targetDir, relFromNm)

    const stats = statSync(source, { throwIfNoEntry: false })
    if (!stats) continue
    const isDir = stats.isDirectory()

    const realpath = toSlash(realpathSync(source))

    mkdirSync(path.dirname(dest), { recursive: true })

    // Windows can return different casing for the same path (C: vs c:),
    // so compare case-insensitively to avoid false symlink detection.
    const isSymlink = isWin
      ? source.toLowerCase() !== realpath.toLowerCase()
      : source !== realpath
    if (isSymlink) {
      // It's a symlink (common with pnpm) — recreate as a relative symlink
      // so Node.js module resolution works correctly at runtime.
      // On Windows use junctions for directories — they don't require
      // admin privileges or Developer Mode, unlike 'dir' symlinks.
      const realNmIdx = realpath.indexOf('node_modules')
      if (realNmIdx === -1) continue
      const realdest = path.join(targetDir, realpath.slice(realNmIdx))
      mkdirSync(path.dirname(realdest), { recursive: true })
      try {
        symlinkSync(
          path.relative(path.dirname(dest), realdest),
          dest,
          isDir ? (isWin ? 'junction' : 'dir') : 'file',
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
