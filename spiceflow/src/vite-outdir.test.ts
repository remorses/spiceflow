import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, test } from 'vitest'
import { resolveConfig, type PluginOption, type UserConfig } from 'vite'

import spiceflow from './vite.js'

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  )
})

async function createTempApp() {
  const root = await mkdtemp(path.join(tmpdir(), 'spiceflow-vite-outdir-'))
  tempRoots.push(root)
  await mkdir(path.join(root, 'src'), { recursive: true })
  await writeFile(
    path.join(root, 'src/main.tsx'),
    [
      `import { Spiceflow } from 'spiceflow'`,
      `export const app = new Spiceflow()`,
      `  .layout('/*', async ({ children }) => (`,
      `    <html><body>{children}</body></html>`,
      `  ))`,
      `  .page('/', async () => <div>ok</div>)`,
      '',
    ].join('\n'),
  )
  return root
}

async function resolveSpiceflowConfig(options?: {
  cloudflare?: boolean
  userConfig?: UserConfig
}) {
  const root = await createTempApp()
  const plugins: PluginOption[] = [spiceflow({ entry: './src/main.tsx' })]

  if (options?.cloudflare) {
    plugins.unshift({ name: 'vite-plugin-cloudflare' })
  }

  const config = await resolveConfig(
    {
      ...options?.userConfig,
      root,
      build: { ...options?.userConfig?.build, outDir: '.custom-build' },
      plugins: [...(options?.userConfig?.plugins ?? []), ...plugins],
    },
    'build',
    'production',
  )

  return { root, config }
}

describe('spiceflow outDir normalization', () => {
  test('top-level build.outDir becomes the single source of truth', async () => {
    const { root, config } = await resolveSpiceflowConfig()

    expect(path.resolve(root, config.build.outDir)).toBe(
      path.resolve(root, '.custom-build'),
    )
    expect(config.environments.client.build.outDir).toBe(
      path.resolve(root, '.custom-build/client'),
    )
    expect(config.environments.rsc.build.outDir).toBe(
      path.resolve(root, '.custom-build/rsc'),
    )
    expect(config.environments.ssr.build.outDir).toBe(
      path.resolve(root, '.custom-build/ssr'),
    )
  })

  test('cloudflare keeps ssr nested under the rsc worker root', async () => {
    const { root, config } = await resolveSpiceflowConfig({ cloudflare: true })

    expect(path.resolve(root, config.build.outDir)).toBe(
      path.resolve(root, '.custom-build'),
    )
    expect(config.environments.client.build.outDir).toBe(
      path.resolve(root, '.custom-build/client'),
    )
    expect(config.environments.rsc.build.outDir).toBe(
      path.resolve(root, '.custom-build/rsc'),
    )
    expect(config.environments.ssr.build.outDir).toBe(
      path.resolve(root, '.custom-build/rsc/ssr'),
    )
  })
  test('server environments normalize to js entry filenames', async () => {
    const { config } = await resolveSpiceflowConfig()

    expect(config.plugins.some((plugin) => plugin.name === 'spiceflow:output-module-package')).toBe(
      true,
    )
    expect(config.environments.rsc.build.rollupOptions.output).toMatchObject({
      entryFileNames: '[name].js',
    })
    expect(config.environments.ssr.build.rollupOptions.output).toMatchObject({
      entryFileNames: '[name].js',
    })
  })

  test('all environments enable holdUntilCrawlEnd', async () => {
    const { config } = await resolveSpiceflowConfig()

    expect(config.environments.client.optimizeDeps.holdUntilCrawlEnd).toBe(true)
    expect(config.environments.rsc.optimizeDeps.holdUntilCrawlEnd).toBe(true)
    expect(config.environments.ssr.optimizeDeps.holdUntilCrawlEnd).toBe(true)
  })

  test('server environments opt into dep discovery', async () => {
    const { config } = await resolveSpiceflowConfig()

    expect(config.environments.client.optimizeDeps.noDiscovery).toBe(false)
    expect(config.environments.rsc.optimizeDeps.noDiscovery).toBe(false)
    expect(config.environments.ssr.optimizeDeps.noDiscovery).toBe(false)
  })

  test('all environments get optimizeDeps entries for the app entry', async () => {
    const { config } = await resolveSpiceflowConfig()

    expect(config.environments.client.optimizeDeps.entries).toContain(
      './src/main.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
    )
    expect(config.environments.rsc.optimizeDeps.entries).toContain(
      './src/main.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
    )
    expect(config.environments.ssr.optimizeDeps.entries).toContain(
      './src/main.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
    )
  })

  test('preserves function names by default', async () => {
    const { config } = await resolveSpiceflowConfig()

    expect(config.build.rollupOptions.output).toMatchObject({
      keepNames: true,
    })
    expect(
      config.environments.client.optimizeDeps.rolldownOptions.output.keepNames,
    ).toBe(true)
    expect(config.environments.rsc.optimizeDeps.rolldownOptions.output.keepNames).toBe(
      true,
    )
    expect(config.environments.ssr.optimizeDeps.rolldownOptions.output.keepNames).toBe(
      true,
    )
  })

  test('does not override explicit keepNames config', async () => {
    const { config } = await resolveSpiceflowConfig({
      userConfig: {
        build: {
          rollupOptions: { output: { keepNames: false } },
        },
        environments: {
          rsc: {
            optimizeDeps: {
              rolldownOptions: { output: { keepNames: false } },
            },
          },
        },
        optimizeDeps: {
          rolldownOptions: { output: { keepNames: false } },
        },
      },
    })

    expect(config.build.rollupOptions.output).toMatchObject({
      keepNames: false,
    })
    expect(
      config.environments.client.optimizeDeps.rolldownOptions.output.keepNames,
    ).toBe(false)
    expect(config.environments.rsc.optimizeDeps.rolldownOptions.output.keepNames).toBe(
      false,
    )
    expect(config.environments.ssr.optimizeDeps.rolldownOptions.output.keepNames).toBe(
      true,
    )
  })
})
