// Verifies the packed Vite entry resolves the consumer's Vite peer under pnpm.
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const packageDir = path.resolve(import.meta.dirname, '..')
const tempRoot = await mkdtemp(
  path.join(tmpdir(), 'spiceflow-package-consumer-'),
)
const appDir = path.join(tempRoot, 'app')

function run({
  command,
  args,
  cwd,
  quiet = false,
}: {
  command: string
  args: string[]
  cwd: string
  quiet?: boolean
}) {
  console.log(`$ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: quiet ? 'pipe' : 'inherit',
  })
  if (result.status === 0) return
  if (quiet) {
    process.stderr.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
  }
  throw new Error(`${command} exited with status ${result.status}`)
}

try {
  console.log('Packing Spiceflow...')
  run({
    command: 'pnpm',
    args: ['pack', '--pack-destination', tempRoot],
    cwd: packageDir,
    quiet: true,
  })
  const tarballName = (await readdir(tempRoot)).find((name) =>
    name.endsWith('.tgz'),
  )
  if (!tarballName) throw new Error('pnpm pack did not create a tarball')

  console.log('Creating a mixed Vite 7 and Vite 8 workspace...')
  await mkdir(appDir)
  await writeFile(
    path.join(tempRoot, 'pnpm-workspace.yaml'),
    ['packages:', '  - app', ''].join('\n'),
  )
  await writeFile(
    path.join(tempRoot, 'package.json'),
    JSON.stringify(
      { private: true, devDependencies: { vite: '7.3.6' } },
      null,
      2,
    ),
  )
  await writeFile(
    path.join(appDir, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        dependencies: {
          react: '19.2.8',
          'react-dom': '19.2.8',
          spiceflow: `file:${path.join(tempRoot, tarballName)}`,
          zod: '4.4.3',
        },
        devDependencies: { vite: '8.2.2' },
      },
      null,
      2,
    ),
  )
  await writeFile(
    path.join(appDir, 'check.mjs'),
    [
      `import { createRequire } from 'node:module'`,
      `const entry = import.meta.resolve('spiceflow/vite')`,
      `const require = createRequire(entry)`,
      `const vite = require('vite/package.json')`,
      `if (vite.version !== '8.2.2') throw new Error('spiceflow/vite resolved Vite ' + vite.version)`,
      `await import('spiceflow/vite')`,
      `console.log('spiceflow/vite resolved Vite ' + vite.version)`,
      '',
    ].join('\n'),
  )

  console.log('Installing the packed package with pnpm...')
  run({ command: 'pnpm', args: ['install', '--ignore-scripts'], cwd: tempRoot })
  run({
    command: process.execPath,
    args: [path.join(appDir, 'check.mjs')],
    cwd: appDir,
  })
} finally {
  await rm(tempRoot, { recursive: true, force: true })
}
