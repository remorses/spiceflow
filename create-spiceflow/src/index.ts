#!/usr/bin/env node

// CLI to scaffold a new Spiceflow project from the official templates.
// Downloads the repo tarball from GitHub and extracts only the chosen template folder.

import { goke } from 'goke'
import {
  intro,
  outro,
  select,
  text,
  isCancel,
  cancel,
  spinner,
} from '@clack/prompts'
import { parseTar } from '@xmorse/tar-parser'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json') as { version: string }

type Template = 'node' | 'cloudflare' | 'bun'

const REPO = 'remorses/spiceflow'
const BRANCH = 'main'

const TEMPLATE_DIRS: Record<Template, string> = {
  node: 'nodejs-example',
  cloudflare: 'cloudflare-example',
  bun: 'nodejs-example',
}

const cli = goke('create-spiceflow')

cli
  .command('[dir]', 'Create a new Spiceflow project')
  .option(
    '-t, --template [template]',
    'Template to use: node, cloudflare, or bun',
  )
  .action(async (dir: string | undefined, options: { template?: string }) => {
    intro('create-spiceflow')

    const projectDir = dir || (await askDir())
    const validTemplates = new Set<string>(['node', 'cloudflare', 'bun'])
    function isTemplate(v: string | undefined): v is Template {
      return v != null && validTemplates.has(v)
    }
    const template = isTemplate(options.template)
      ? options.template
      : await askTemplate()

    const resolved = path.resolve(projectDir)
    if (fs.existsSync(resolved) && fs.readdirSync(resolved).length > 0) {
      cancel(`Directory ${projectDir} already exists and is not empty`)
      process.exit(1)
    }

    const s = spinner()
    s.start('Downloading template...')

    await downloadTemplate({ template, dest: resolved })

    s.stop('Template downloaded')

    // update package.json name to match the project directory
    const pkgPath = path.join(resolved, 'package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      pkg.name = path.basename(resolved)
      delete pkg.private
      // use published spiceflow instead of workspace link
      if (pkg.dependencies?.spiceflow) {
        pkg.dependencies.spiceflow = 'latest'
      }
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    }

    outro(`Project created in ${projectDir}`)

    console.log('')
    console.log('Next steps:')
    console.log(`  cd ${projectDir}`)
    console.log('  npm install')
    console.log('  npm run dev')
    console.log('')
  })

cli.help()
cli.version(packageJson.version)
cli.parse()

async function askDir(): Promise<string> {
  const value = await text({
    message: 'Where should we create the project?',
    placeholder: 'my-app',
    validate(v) {
      if (!v) return 'Please enter a directory name'
    },
  })
  if (isCancel(value)) {
    cancel('Cancelled')
    process.exit(0)
  }
  return value
}

async function askTemplate(): Promise<Template> {
  const value = await select<Template>({
    message: 'Which template?',
    options: [
      { value: 'node', label: 'Node.js' },
      { value: 'bun', label: 'Bun' },
      { value: 'cloudflare', label: 'Cloudflare Workers' },
    ],
  })
  if (isCancel(value)) {
    cancel('Cancelled')
    process.exit(0)
  }
  // narrowed by isCancel guard above
  return value
}

async function downloadTemplate({
  template,
  dest,
}: {
  template: Template
  dest: string
}) {
  const tarUrl = `https://github.com/${REPO}/archive/${BRANCH}.tar.gz`
  const res = await fetch(tarUrl)
  if (!res.ok) {
    throw new Error(
      `Failed to download template: ${res.status} ${res.statusText}`,
    )
  }

  const prefix = TEMPLATE_DIRS[template]
  const gz = res.body!.pipeThrough(new DecompressionStream('gzip'))

  await parseTar(gz, async (entry) => {
    if (entry.header.type !== 'file') return

    // tar paths look like "spiceflow-main/nodejs-example/package.json"
    // strip the first segment (repo-branch) then match the template prefix
    const parts = entry.name.split('/')
    const rel = parts.slice(1).join('/')

    if (!rel.startsWith(prefix + '/')) return

    // strip the template prefix to get the file path inside the project
    const filePath = rel.slice(prefix.length + 1)
    if (!filePath) return

    const buf = await entry.arrayBuffer()
    if (buf.byteLength >= 1_000_000) return

    let content: string
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      // binary file, write raw bytes
      const outPath = path.join(dest, filePath)
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, Buffer.from(buf))
      return
    }

    // for bun template, patch node references
    if (template === 'bun') {
      content = patchForBun(filePath, content)
    }

    const outPath = path.join(dest, filePath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, content)
  })
}

function patchForBun(filePath: string, content: string): string {
  if (filePath === 'package.json') {
    const pkg = JSON.parse(content)
    pkg.scripts = {
      dev: 'bunx --bun vite dev',
      build: 'bunx --bun vite build --app',
      start: 'bun dist/rsc/index.js',
    }
    return JSON.stringify(pkg, null, 2) + '\n'
  }
  return content
}
