// Benchmark script for the nodejs-example Spiceflow app.
// Builds the app, starts the production server, runs bombardier against
// /static-page.html, /about (RSC page), and a Hono baseline.
// Phase 2 re-runs the Spiceflow /about benchmark with --cpu-prof enabled.
// Profile files are saved to tmp/cpu-profiles/ for analysis with profano.

import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

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

async function main() {
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
  console.log('  Phase 1: Benchmark (no profiling)')
  console.log('========================================')

  // Start Spiceflow server
  const server = spawnProcess('node', ['dist/rsc/index.js'], { PORT: String(PORT) })
  // Start Hono baseline
  const hono = spawnProcess('tsx', ['hono-baseline.ts'], { HONO_PORT: String(HONO_PORT) })

  try {
    await Promise.all([
      waitForServer(`${BASE}/about`),
      waitForServer(`${HONO_BASE}/health`),
    ])
    console.log('Both servers ready.\n')

    // Warmup both
    await warmup(`${BASE}/about`)
    await warmup(`${BASE}/static-page.html`)
    await warmup(`${HONO_BASE}/about`)

    // Benchmark
    runBombardier(`${HONO_BASE}/about`, 'Hono baseline /about (plain HTML)')
    runBombardier(`${BASE}/static-page.html`, 'Spiceflow static /static-page.html')
    runBombardier(`${BASE}/about`, 'Spiceflow RSC /about')
  } finally {
    await Promise.all([stopProcess(server), stopProcess(hono)])
  }

  // =============================================
  //  Phase 2: Spiceflow /about with --cpu-prof
  // =============================================
  console.log('\n========================================')
  console.log('  Phase 2: Spiceflow /about with --cpu-prof')
  console.log('========================================')

  if (existsSync(PROFILE_DIR)) {
    rmSync(PROFILE_DIR, { recursive: true })
  }
  mkdirSync(PROFILE_DIR, { recursive: true })

  const profServer = spawnProcess('node', [
    '--cpu-prof',
    '--cpu-prof-dir', PROFILE_DIR,
    '--input-type=module',
    '-e',
    `process.on("SIGUSR2", () => process.exit(0)); await import("./dist/rsc/index.js");`,
  ], { PORT: String(PORT) })

  try {
    await waitForServer(`${BASE}/about`)
    console.log('Server ready.\n')
    await warmup(`${BASE}/about`, 10)
    runBombardier(`${BASE}/about`, 'Spiceflow RSC /about (profiled)')
  } finally {
    await stopProcess(profServer, 'SIGUSR2')
  }

  console.log(`\nProfile files saved in: ${PROFILE_DIR}`)
  console.log('Analyze with: node /Users/morse/Documents/GitHub/kimakivoice/profano/dist/cli.js tmp/cpu-profiles/*.cpuprofile -n 40')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
