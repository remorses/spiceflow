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
import { Link, router, useRouterState } from 'spiceflow/react'
import { useLoaderData } from 'spiceflow/react'

type ProjectLoaderData = { projectId: string }

export function ProjectPage() {
  const data = useLoaderData<ProjectLoaderData>('/projects/:projectId')
  const state = useRouterState()
  data.projectId.toUpperCase()
  // @ts-expect-error unknown loader fields stay rejected through the register pattern
  data.missing
  const projectHref = router.href('/projects/:projectId', { projectId: data.projectId })
  const loginHref = router.href('/login')
  // @ts-expect-error invalid router hrefs stay rejected
  router.href('/missing')
  // @ts-expect-error missing params stay rejected
  router.href('/projects/:projectId')
  return (
    <nav>
      <Link href={loginHref}>{state.pathname}</Link>
      <Link href={projectHref}>Project</Link>
      <Link href="/login">Raw login</Link>
      <Link href="/projects/:projectId" params={{ projectId: data.projectId }}>Pattern project</Link>
      {/* @ts-expect-error invalid Link hrefs stay rejected */}
      <Link href="/missing">Missing</Link>
      {/* @ts-expect-error Link params stay checked */}
      <Link href="/projects/:projectId" params={{ slug: data.projectId }}>Bad params</Link>
    </nav>
  )
}
`,
  )

  fs.writeFileSync(
    appPath,
    `
import { Spiceflow } from 'spiceflow'
import { ProjectPage } from './project-page.tsx'
import type { IsAny } from '../../types.ts'

type ProjectLoaderData = { projectId: string }

export const app = new Spiceflow()
  .page('/login', async () => 'login')
  .loader('/projects/:projectId', async ({ params }): Promise<ProjectLoaderData> => ({
    projectId: params.projectId,
  }))
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
