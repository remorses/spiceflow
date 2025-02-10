import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import react, { type Options as ReactOptions } from '@vitejs/plugin-react'
import { clientTransform, serverTransform } from 'unplugin-rsc'
import * as vite from 'vite'
import { debugTransformResult } from './vite.js'
import { noramlizeClientReferenceId } from './react/utils/normalize.js'

export default function reactServerDOM(): vite.PluginOption {
  let env: vite.ConfigEnv
  const serverEnvironments = new Set(['rsc'])
  const ssrEnvironments = new Set(['ssr'])
  const browserEnvironment = 'client'

  const clientEntries = new Set<string>()
  const clientModules = new Map<string, string>()
  const serverModules = new Map<string, string>()
  let browserOutput: vite.Rollup.RollupOutput | undefined

  let server: vite.ViteDevServer
  let generateId = (filename, directive) => {
    if (env.command === 'build') {
      const hash = crypto
        .createHash('sha256')
        .update(filename)
        .digest('hex')
        .slice(0, 8)

      if (directive === 'use server') {
        serverModules.set(filename, hash)
        return hash
      }

      clientModules.set(filename, hash)
      return hash
    }

    return noramlizeClientReferenceId(filename, server)
  }

  return [
    
  ]
}

function rollupInputsToArray(
  rollupInputs: vite.Rollup.InputOption | undefined,
) {
  return Array.isArray(rollupInputs)
    ? rollupInputs
    : typeof rollupInputs === 'string'
      ? [rollupInputs]
      : rollupInputs
        ? Object.values(rollupInputs)
        : []
}

function collectChunks(
  base: string,
  forFilename: string,
  manifest: Record<string, { file: string; imports: string[] }>,
  collected: Set<string> = new Set(),
) {
  if (manifest[forFilename]) {
    collected.add(base + manifest[forFilename].file)
    for (const imp of manifest[forFilename].imports ?? []) {
      collectChunks(base, imp, manifest, collected)
    }
  }

  return Array.from(collected)
}

function moveStaticAssets(
  output: vite.Rollup.RollupOutput,
  outDir: string,
  clientOutDir: string,
) {
  const manifestAsset = output.output.find(
    (asset) => asset.fileName === '.vite/ssr-manifest.json',
  )
  if (!manifestAsset || manifestAsset.type !== 'asset')
    throw new Error('could not find manifest')
  const manifest = JSON.parse(manifestAsset.source as string)

  const processed = new Set<string>()
  for (const assets of Object.values(manifest) as string[][]) {
    for (const asset of assets) {
      const fullPath = path.join(outDir, asset.slice(1))

      if (asset.endsWith('.js') || processed.has(fullPath)) continue
      processed.add(fullPath)

      if (!fs.existsSync(fullPath)) continue

      const relative = path.relative(outDir, fullPath)
      fs.renameSync(fullPath, path.join(clientOutDir, relative))
    }
  }
}

const EXTENSIONS_TO_TRANSFORM = new Set([
  '.js',
  '.jsx',
  '.cjs',
  '.cjsx',
  '.mjs',
  '.mjsx',
  '.ts',
  '.tsx',
  '.cts',
  '.ctsx',
  '.mts',
  '.mtsx',
])
