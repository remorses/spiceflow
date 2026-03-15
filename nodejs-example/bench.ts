// Benchmark script for the nodejs-example Spiceflow app.
// Builds the app, starts the production server, runs bombardier against
// /static-page.html, /about (RSC page), and a Hono baseline.
// Phase 2 re-runs the Spiceflow /about benchmark with --cpu-prof enabled.
// Profile files are saved to tmp/cpu-profiles/ for analysis with profano.
//
// Usage:
//   pnpm bench              # run with Node.js (default)
//   pnpm bench -- --bun     # run with Bun

import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const useBun = process.argv.includes('--bun')
const RUNTIME = useBun ? 'bun' : 'node'

const PORT = 3321
const HONO_PORT = 3322
const BASE = `http://localhost:${PORT}`
const HONO_BASE = `http://localhost:${HONO_PORT}`
const BOMBARDIER = 'bombardier'
const DURATION = '10s'
const CONNECTIONS = 50
const PROFILE_DIR = join(import.meta.dirname, 'tmp', 'cpu-profiles')

async function waitForServer(url: string, timeoutMs = 20_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch {}
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`)
}

function runBombardier(url: string, label: string): string {
  console.log(`\n--- ${label} ---`)
  const result = execSync(
    `${BOMBARDIER} -c ${CONNECTIONS} -d ${DURATION} --print result --latencies ${url}`,
    { encoding: 'utf-8', timeout: 120_000 },
  )
  console.log(result)
  return result
}

function spawnProcess(cmd: string, args: string[], env: Record<string, string> = {}): ChildProcess {
  const proc = spawn(cmd, args, {
    cwd: import.meta.dirname,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  })
  proc.stderr?.on('data', (d) => process.stderr.write(d))
  proc.stdout?.on('data', (d) => process.stdout.write(d))
  return proc
}

async function stopProcess(proc: ChildProcess, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
  proc.kill(signal)
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL')
      resolve()
    }, 8_000)
    proc.on('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

async function warmup(url: string, n = 20): Promise<void> {
  console.log(`Warming up ${url}...`)
  for (let i = 0; i < n; i++) {
    await fetch(url)
  }
}

function startServer(env: Record<string, string>): ChildProcess {
  return spawnProcess(RUNTIME, ['dist/rsc/index.js'], env)
}

function startProfiledServer(env: Record<string, string>): ChildProcess {
  // Both Node and Bun only write --cpu-prof on clean process.exit().
  // Inject a SIGUSR2 handler that calls process.exit(0) to trigger flush.
  if (useBun) {
    return spawnProcess('bun', [
      '--cpu-prof',
      '--cpu-prof-dir', PROFILE_DIR,
      '-e',
      `process.on("SIGUSR2", () => process.exit(0)); await import("./dist/rsc/index.js");`,
    ], env)
  }

  return spawnProcess('node', [
    '--cpu-prof',
    '--cpu-prof-dir', PROFILE_DIR,
    '--input-type=module',
    '-e',
    `process.on("SIGUSR2", () => process.exit(0)); await import("./dist/rsc/index.js");`,
  ], env)
}

async function main() {
  console.log(`Runtime: ${RUNTIME}\n`)

  // 1. Build
  console.log('Building app...')
  execSync('pnpm build', {
    stdio: 'inherit',
    cwd: import.meta.dirname,
    env: { ...process.env },
  })

  // =============================================
  //  Phase 1: Benchmark all endpoints (no profiling)
  // =============================================
  console.log('\n========================================')
  console.log(`  Phase 1: Benchmark with ${RUNTIME} (no profiling)`)
  console.log('========================================')

  const server = startServer({ PORT: String(PORT) })
  const hono = spawnProcess('tsx', ['hono-baseline.ts'], { HONO_PORT: String(HONO_PORT) })

  try {
    await Promise.all([
      waitForServer(`${BASE}/about`),
      waitForServer(`${HONO_BASE}/health`),
    ])
    console.log('Both servers ready.\n')

    await warmup(`${BASE}/about`)
    await warmup(`${BASE}/static-page.html`)
    await warmup(`${HONO_BASE}/about`)

    runBombardier(`${HONO_BASE}/about`, 'Hono baseline /about (plain HTML)')
    runBombardier(`${BASE}/static-page.html`, `Spiceflow static /static-page.html (${RUNTIME})`)
    runBombardier(`${BASE}/about`, `Spiceflow RSC /about (${RUNTIME})`)
  } finally {
    await Promise.all([stopProcess(server), stopProcess(hono)])
  }

  // =============================================
  //  Phase 2: Spiceflow /about with --cpu-prof
  // =============================================
  console.log('\n========================================')
  console.log(`  Phase 2: Spiceflow /about with --cpu-prof (${RUNTIME})`)
  console.log('========================================')

  if (existsSync(PROFILE_DIR)) {
    rmSync(PROFILE_DIR, { recursive: true })
  }
  mkdirSync(PROFILE_DIR, { recursive: true })

  const profServer = startProfiledServer({ PORT: String(PORT) })

  try {
    await waitForServer(`${BASE}/about`)
    console.log('Server ready.\n')
    await warmup(`${BASE}/about`, 10)
    runBombardier(`${BASE}/about`, `Spiceflow RSC /about (${RUNTIME}, profiled)`)
  } finally {
    // Both runtimes use SIGUSR2 handler to trigger process.exit(0) for profile flush
    await stopProcess(profServer, 'SIGUSR2')
  }

  console.log(`\nProfile files saved in: ${PROFILE_DIR}`)
  console.log('Analyze with: profano tmp/cpu-profiles/*.cpuprofile -n 40')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
