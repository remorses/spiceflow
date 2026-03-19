import { describe, test, expect } from 'vitest'
import { ChildProcess, spawn, execFileSync } from 'node:child_process'
import { kill } from 'node:process'
import psTree from 'ps-tree'
import { getAvailablePort } from './get-available-port.ts'

function whichSync(cmd: string): string | undefined {
  try {
    return execFileSync('which', [cmd], { encoding: 'utf-8' }).trim()
  } catch {
    return undefined
  }
}

const bunPath = whichSync('bun')

const listenScript = `
import { Spiceflow } from 'spiceflow'
const port = process.env.SPICEFLOW_PORT
if (!port) throw new Error('SPICEFLOW_PORT environment variable is not set')
const app = new Spiceflow().get('/hello', () => 'Hello, World!')
app.listen(Number(port))
`.trim()

const listenForNodeScript = `
import { Spiceflow } from 'spiceflow'
const port = process.env.SPICEFLOW_PORT
if (!port) throw new Error('SPICEFLOW_PORT environment variable is not set')
const app = new Spiceflow().get('/hello', () => 'Hello, World!')
app.listenForNode(Number(port))
`.trim()

describe('smoke test with node', () => {
  test('running app.listen()', async () => {
    await smokeTestServer({
      command: process.execPath,
      args: ['--input-type=module', '-e', listenScript],
      port: await getAvailablePort(0),
    })
  })
  test('running app.listenForNode()', async () => {
    await smokeTestServer({
      command: process.execPath,
      args: ['--input-type=module', '-e', listenForNodeScript],
      port: await getAvailablePort(0),
    })
  })
})

describe.skipIf(!bunPath)('smoke test with bun', () => {
  test('running app.listen()', async () => {
    await smokeTestServer({
      command: bunPath!,
      args: ['-e', listenScript],
      port: await getAvailablePort(0),
    })
  })

  test('running app.listenForNode()', async () => {
    await smokeTestServer({
      command: bunPath!,
      args: ['-e', listenForNodeScript],
      port: await getAvailablePort(0),
    })
  })
})

interface SmokeTestServerInput {
  port: number
  command: string
  args: string[]
}

async function smokeTestServer(input: SmokeTestServerInput): Promise<void> {
  const { port, command, args } = input

  const childProcess = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {
      SPICEFLOW_PORT: String(port),
    } as unknown as NodeJS.ProcessEnv,
  }) as ChildProcess

  const { resolve, reject, promise } = Promise.withResolvers<void>()

  let printedListeningToLocalhost = false
  childProcess.stdout!.on('data', (data) => {
    const chunk = data.toString()
    if (chunk === `Listening on http://localhost:${port}\n`) {
      printedListeningToLocalhost = true
      resolve()
    } else {
      console.error(chunk)
      reject(new Error(`Unexpected output to stdout`))
    }
  })

  childProcess.on('close', (exitCode) => {
    if (exitCode !== 0 && exitCode !== null) {
      reject(
        new Error(
          `Process exited with code ${exitCode}; command: SPICEFLOW_PORT=${port} ${command} ${args.join(' ')}`,
        ),
      )
    }
    resolve()
  })

  try {
    await promise

    expect(printedListeningToLocalhost).toBe(true)

    const response = await fetch(`http://0.0.0.0:${port}/hello`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    const body = await response.text()
    expect(body).toBe('"Hello, World!"')
  } finally {
    await stopChildProcess(childProcess)
  }
}

async function stopChildProcess(childProcess: ChildProcess): Promise<void> {
  if (!childProcess.pid) {
    return
  }

  const { resolve, reject, promise } = Promise.withResolvers<void>()
  psTree(childProcess.pid, (error, children) => {
    if (error) {
      reject(error)
      return
    }

    for (const child of children) {
      try {
        kill(Number(child.PID), 'SIGINT')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
          reject(error)
          return
        }
      }
    }

    try {
      kill(childProcess.pid!, 'SIGINT')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
        reject(error)
        return
      }
    }

    resolve()
  })

  await promise
}
