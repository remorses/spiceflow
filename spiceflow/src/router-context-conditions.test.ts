import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, test } from 'vitest'

const execFileAsync = promisify(execFile)

test('ssr condition wins over browser for router request context', async () => {
  const script = `
    const mod = await import('#router-context')
    const value = mod.routerContextStorage.run({ pathname: '/deep' }, () => mod.getRouterContext()?.pathname)
    console.log(value)
  `

  const { stdout } = await execFileAsync(process.execPath, [
    '--conditions=browser',
    '--conditions=ssr',
    '--input-type=module',
    '-e',
    script,
  ])

  expect(stdout.trim()).toBe('/deep')
})
