// Helpers for running the Cloudflare example dev and preview servers in Vitest.
import { spawn, type ChildProcess } from 'node:child_process'

type CommandResult = {
  stdout: string
  stderr: string
}

type StartedServer = {
  process: ChildProcess
  baseUrl: string
  output: () => string
}

export async function runCommand({
  command,
  args,
  cwd,
}: {
  command: string
  args: string[]
  cwd: string
}): Promise<CommandResult> {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdout = ''
  let stderr = ''

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 0))
  })

  if (exitCode !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(' ')}\n${stdout}\n${stderr}`,
    )
  }

  return { stdout, stderr }
}

export async function startServer({
  command,
  args,
  cwd,
}: {
  command: string
  args: string[]
  cwd: string
}): Promise<StartedServer> {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString()
  })
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString()
  })

  try {
    const baseUrl = await waitForReady({ child, output: () => output })
    return {
      process: child,
      baseUrl,
      output: () => output,
    }
  } catch (error) {
    child.kill('SIGTERM')
    throw error
  }
}

export async function stopServer({
  process,
}: {
  process: ChildProcess
}): Promise<void> {
  if (process.exitCode !== null) return

  process.kill('SIGTERM')
  await new Promise<void>((resolve) => {
    process.once('close', () => resolve())
    setTimeout(() => {
      if (process.exitCode === null) {
        process.kill('SIGKILL')
      }
      resolve()
    }, 5_000)
  })
}

export async function getPageSummary({ url }: { url: string }) {
  const response = await fetch(url)
  const html = await response.text()

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    hasHeading: html.includes('How is this not illegal?'),
    hasKvText: html.includes('POKEMON_KV'),
    hasRscText: html.includes('React Server Components'),
    pokemonLinks: html.match(/href="\/pokemon\/\d+"/g)?.length ?? 0,
    hasMissingModuleError: html.includes('No such module'),
    hasWorkerException: html.includes('Worker threw exception'),
    has1101: html.includes('Error 1101'),
  }
}

async function waitForReady({
  child,
  output,
}: {
  child: ChildProcess
  output: () => string
}): Promise<string> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 90_000) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early\n${output()}`)
    }

    const localUrl = getLocalUrl({ text: output() })
    try {
      if (!localUrl) {
        await sleep({ ms: 500 })
        continue
      }

      const response = await fetch(localUrl, {
        signal: AbortSignal.timeout(5_000),
      })
      if (response.ok) return localUrl
    } catch {}

    await sleep({ ms: 500 })
  }

  throw new Error(`Timed out waiting for local server url\n${output()}`)
}

function getLocalUrl({ text }: { text: string }): string | undefined {
  const plain = text.replace(/\x1b\[[0-9;]*m/g, '')
  const match = plain.match(
    /Local:\s+(http:\/\/(?:localhost|127\.0\.0\.1):\d+\/?)/,
  )
  if (!match) return undefined
  return match[1]
}

function sleep({ ms }: { ms: number }): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
