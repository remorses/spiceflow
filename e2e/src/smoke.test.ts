import { describe, test, expect } from 'vitest'
import { ChildProcess, spawn } from 'node:child_process'
import { resolve as resolvePath } from 'node:path'
import { kill } from 'node:process'
import psTree from 'ps-tree'
import { getAvailablePort } from './get-available-port.ts'

describe('smoke test with node', () => {
  test('running app.listen()', async () => {
    await smokeTestServer({
      command: 'node',
      args: ['./app-listen.js'],
      port: await getAvailablePort(0),
    })
  })
  test('running app.listenForNode()', async () => {
    await smokeTestServer({
      command: 'node',
      args: ['./app-listen-for-node.js'],
      port: await getAvailablePort(0),
    })
  })
})

describe('smoke test with bun', () => {
  test('running app.listen()', async () => {
    await smokeTestServer({
      command: 'bun',
      args: ['./app-listen.js'],
      port: await getAvailablePort(0),
    })
  })

  // Bun has a Node compatibility layer. Checking that the Node-specific
  // implementation also works there.
  test('running app.listenForNode()', async () => {
    await smokeTestServer({
      command: 'bun',
      args: ['./app-listen-for-node.js'],
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

  // Only accepts commands that are in node_modules/.bin to ensure that tests
  // are properly reproducible.
  const commandPath = resolvePath(
    import.meta.dirname,
    '../node_modules/.bin',
    command,
  )
  const childProcess = spawn(commandPath, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {
      SPICEFLOW_PORT: String(port),
    },
    cwd: import.meta.dirname,
  })

  const { resolve, reject, promise } = Promise.withResolvers<void>()

  let printedListeningToLocalhost = false
  childProcess.stdout.on('data', (data) => {
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
          `Process exited with code ${exitCode}; run '(cd ${import.meta.dirname}; SPICEFLOW_PORT=${port} ${command} ${args.join(' ')})' to investigate.`,
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
