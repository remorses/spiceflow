// Type-level repros for loader data inside server handler contexts.
// These compile small snippets because the bug only appears during TypeScript inference.
import { rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'
import ts from 'typescript'

function getDiagnosticsForSnippet(source: string) {
  const srcDir = dirname(new URL(import.meta.url).pathname)
  const tsconfigPath = join(srcDir, '..', '..', 'tsconfig.json')
  const snippetPath = join(srcDir, '__tmp-loader-data-context-check.tsx')

  writeFileSync(snippetPath, source)

  try {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      dirname(tsconfigPath),
      { noEmit: true },
      tsconfigPath,
    )
    const program = ts.createProgram({
      rootNames: [snippetPath],
      options: parsedConfig.options,
    })

    return ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => diagnostic.file?.fileName === snippetPath)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  } finally {
    rmSync(snippetPath)
  }
}

test('page and layout handlers receive merged loader data', () => {
  const diagnostics = getDiagnosticsForSnippet(`
import { Spiceflow } from '../spiceflow.tsx'

const app = new Spiceflow()
  .loader('/*', async () => ({ session: { user: { name: 'Ada' } } }))
  .loader('/orgs/:orgId/projects/:projectId/*', async ({ params }) => ({
    orgId: params.orgId,
    projectId: params.projectId,
  }))
  .layout('/orgs/:orgId/projects/:projectId/*', async ({ loaderData }) => {
    loaderData.session.user.name
    loaderData.orgId.toUpperCase()
    loaderData.projectId.toUpperCase()
    // @ts-expect-error unknown loader fields stay rejected
    loaderData.missing
    return null
  })
  .page('/orgs/:orgId/projects/:projectId/settings', async ({ loaderData }) => {
    loaderData.session.user.name
    loaderData.orgId.toUpperCase()
    loaderData.projectId.toUpperCase()
    // @ts-expect-error unknown loader fields stay rejected
    loaderData.missing
    return null
  })
`)

  expect(diagnostics).toEqual([])
})

test('loader result is inferred in useLoaderData through app register', () => {
  const diagnostics = getDiagnosticsForSnippet(`
import { Spiceflow } from '../spiceflow.tsx'
import { useLoaderData } from '../react/index.ts'

type DashboardData = { user: { name: string } }

function Dashboard() {
  const loaderData = useLoaderData('/dashboard')
  loaderData.user.name.toUpperCase()
  // @ts-expect-error unknown loader fields stay rejected
  loaderData.missing
  return null
}

const app = new Spiceflow()
  .loader('/dashboard', async (): Promise<DashboardData> => ({
    user: { name: 'Ada' },
  }))
  .page('/dashboard', async () => <Dashboard />)

declare module '../react/router.js' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
`)

  expect(diagnostics).toEqual([])
})
