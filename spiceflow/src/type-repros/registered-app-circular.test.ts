// Type-level repro for registered app inference when route handlers render client components.
import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import ts from 'typescript'

function getDiagnosticsForCircularFixture() {
  const srcDir = path.dirname(new URL(import.meta.url).pathname)
  const packageDir = path.join(srcDir, '..', '..')
  const fixtureDir = fs.mkdtempSync(path.join(srcDir, '__tmp-register-repro-'))
  const appPath = path.join(fixtureDir, 'app.tsx')
  const componentPath = path.join(fixtureDir, 'project-page.tsx')

  fs.writeFileSync(
    componentPath,
    `
import { useLoaderData } from 'spiceflow/react'

export function ProjectPage() {
  const data = useLoaderData('/projects/:projectId')
  data.projectId.toUpperCase()
  // @ts-expect-error unknown loader fields stay rejected through the register pattern
  data.missing
  return null
}
`,
  )

  fs.writeFileSync(
    appPath,
    `
import { Spiceflow } from 'spiceflow'
import { ProjectPage } from './project-page.tsx'
import type { IsAny } from '../../types.ts'

export const app = new Spiceflow()
  .loader('/projects/:projectId', async ({ params }) => ({ projectId: params.projectId }))
  .page('/projects/:projectId', async () => <ProjectPage />)

type AppMustNotBecomeAny = IsAny<typeof app>
const appMustNotBecomeAny: AppMustNotBecomeAny = false
void appMustNotBecomeAny

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
`,
  )

  try {
    const configFile = ts.readConfigFile(
      path.join(packageDir, 'tsconfig.json'),
      ts.sys.readFile,
    )
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      packageDir,
      { noEmit: true },
      path.join(packageDir, 'tsconfig.json'),
    )
    const program = ts.createProgram({
      rootNames: [appPath],
      options: parsedConfig.options,
    })

    return ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => diagnostic.file?.fileName.startsWith(fixtureDir))
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true })
  }
}

test('registered app type does not make the app initializer circular', () => {
  expect(getDiagnosticsForCircularFixture()).toEqual([])
})
