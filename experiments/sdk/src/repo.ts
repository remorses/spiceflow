import path from 'path'
import fs from 'fs'
import { replaceParamsInTemplate } from './sdk'
import { Language, BoilerplateParams } from './types'
import { recursiveReadDir } from './utils'
import { exec } from 'child_process'

import { spawn } from 'child_process'

async function spawnAsync(
  command: string,
  options: { cwd: string },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ')
    const proc = spawn(cmd, args, {
      ...options,
      stdio: 'inherit',
    })

    proc.on('error', (error) => {
      reject(error)
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Process exited with code ${code}`))
      }
    })
  })
}

export async function buildStep({
  cwd,
  language,
}: {
  cwd: string
  language: Language
}) {
  if (language === 'typescript') {
    await spawnAsync('pnpm install', { cwd })
    await spawnAsync('npm run build', { cwd })
  } else if (language === 'python') {
    await spawnAsync('uv install', { cwd })
  } else {
    throw new Error(`Unsupported language: ${language}`)
  }
}

export async function generateRepoFiles({
  language,
  params,
  outFolder,
  src,
  build = true,
}: {
  language: Language
  params: BoilerplateParams
  outFolder?: string
  build?: boolean
  src: { filename: string; content: string }[]
}) {
  const reposPath = `repos-files/${language}`
  const files = await recursiveReadDir(reposPath)
  const filesWithParams = files.map((file) => {
    const content = fs.readFileSync(file, 'utf-8')
    return {
      path: file,
      content: replaceParamsInTemplate({ template: content, params }),
    }
  })

  if (outFolder) {
    // Write repo files
    for (const file of filesWithParams) {
      const relativePath = path.relative(reposPath, file.path)
      const outPath = path.join(outFolder, relativePath)
      await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
      await fs.promises.writeFile(outPath, file.content)
    }

    // Write src files
    for (const file of src) {
      const outPath = path.join(outFolder, 'src', file.filename)
      await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
      await fs.promises.writeFile(outPath, file.content)
    }
  }
  if (build && outFolder) {
    await buildStep({ cwd: outFolder, language })
  }

  return { files: filesWithParams }
}
