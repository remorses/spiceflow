import { describe, test, afterAll, expect } from 'vitest'
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
      port: await getAvailablePort(62010),
    })
  })
  test('running app.listenForNode()', async () => {
    await smokeTestServer({
      command: 'node',
      args: ['./app-listen-for-node.js'],
      port: await getAvailablePort(62020),
    })
  })
})

describe('smoke test with bun', () => {
  test('running app.listen()', async () => {
    await smokeTestServer({
      command: 'bun',
      args: ['./app-listen.js'],
      port: await getAvailablePort(62110),
    })
  })

  // Bun has a Node compatibility layer. Checking that the Node-specific
  // implementation also works there.
  test('running app.listenForNode()', async () => {
    await smokeTestServer({
      command: 'bun',
      args: ['./app-listen-for-node.js'],
      port: await getAvailablePort(62120),
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
  processes.push(childProcess)

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

  await promise

  expect(printedListeningToLocalhost).toBe(true)

  const response = await fetch(`http://0.0.0.0:${port}/hello`)
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('application/json')
  const body = await response.text()
  expect(body).toBe('"Hello, World!"')
}

// Ensures that processes are killed after all tests are done, otherwise they
// will prevent tests from running again as the port would already be in use.
// (Also, they would just consume resources for not purpose)
// This is not completely foolproof, as killing the test process abruptly will
// prevent the hook from running, thus keeping those children processes around.
const processes: ChildProcess[] = []
afterAll(async () => {
  for (const childProcess of processes) {
    // We have to use ps-tree because:
    // - the process that actually listens to the port is not the process that
    // we spawned but one of its children, as the executables in
    // node_modules/.bin are shell wrappers of the actual programs.
    // - on Unix-like OSes, killing a process does not kill its children.
    const { resolve, reject, promise } = Promise.withResolvers()
    psTree(childProcess.pid!, (error, children) => {
      if (error) {
        reject(error)
      }
      for (const child of children) {
        kill(Number(child.PID), 'SIGINT')
      }
      kill(childProcess.pid!, 'SIGINT')
      resolve()
    })
    await promise
  }
})
