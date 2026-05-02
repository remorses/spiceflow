// Type-level repro for registered app inference when route handlers render client components.
import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import ts from 'typescript'

function getDiagnosticsForCircularFixture(appSource?: string) {
  const srcDir = path.dirname(new URL(import.meta.url).pathname)
  const packageDir = path.join(srcDir, '..', '..')
  const fixtureDir = fs.mkdtempSync(path.join(srcDir, '__tmp-register-repro-'))
  const appPath = path.join(fixtureDir, 'app.tsx')
  const componentPath = path.join(fixtureDir, 'project-page.tsx')

  fs.writeFileSync(
    componentPath,
    `
import { Link, router, useLoaderData, useRouterState } from 'spiceflow/react'

export function ProjectPage() {
  const data = useLoaderData('/projects/:projectId')
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
    appSource ?? `
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

test('router.href inside page handlers does not make the app initializer circular', () => {
  expect(getDiagnosticsForCircularFixture(`
import { Spiceflow } from 'spiceflow'
import { router } from 'spiceflow/react'
import type { IsAny } from '../../types.ts'

export const app = new Spiceflow()
  .page('/login', async () => 'login')
  .page('/dashboard', async () => {
    const href = router.href('/login')
    return <a href={href}>Login</a>
  })

type AppMustNotBecomeAny = IsAny<typeof app>
const appMustNotBecomeAny: AppMustNotBecomeAny = false
void appMustNotBecomeAny

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
`)).toEqual([])
})

test('router.href inside page redirect handlers can still be circular when app metadata includes loaders', () => {
  expect(getDiagnosticsForCircularFixture(`
import { Spiceflow } from 'spiceflow'
import { router } from 'spiceflow/react'
import type { IsAny } from '../../types.ts'

export const app = new Spiceflow()
  .page('/login', async () => 'login')
  .loader('/dashboard', async () => ({ user: { id: '1' } }))
  .page('/dashboard', async ({ redirect }) => {
    const href = router.href('/login')
    return redirect(href)
  })

type AppMustNotBecomeAny = IsAny<typeof app>
const appMustNotBecomeAny: AppMustNotBecomeAny = false
void appMustNotBecomeAny

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
`)).toMatchInlineSnapshot(`
  [
    "Type 'false' is not assignable to type 'true'.",
    "'app' is referenced directly or indirectly in its own type annotation.",
  ]
`)
})

test('router.href inside page handlers with context and loaders does not make the app initializer circular', () => {
  expect(getDiagnosticsForCircularFixture(`
import { Spiceflow } from 'spiceflow'
import { router } from 'spiceflow/react'
import type { IsAny } from '../../types.ts'

export const app = new Spiceflow()
  .page('/login', async () => 'login')
  .loader('/dashboard/:id', async () => ({ user: { id: '1' } }))
  .page('/dashboard/:id', async ({ params }) => {
    const href = router.href('/login')
    return <a href={href}>{params.id}</a>
  })

type AppMustNotBecomeAny = IsAny<typeof app>
const appMustNotBecomeAny: AppMustNotBecomeAny = false
void appMustNotBecomeAny

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
`)).toEqual([])
})

test('router.href inside layout handlers does not make the app initializer circular', () => {
  expect(getDiagnosticsForCircularFixture(`
import { Spiceflow } from 'spiceflow'
import { router } from 'spiceflow/react'
import type { IsAny } from '../../types.ts'

export const app = new Spiceflow()
  .page('/login', async () => 'login')
  .layout('/dashboard/*', async ({ children }) => {
    const href = router.href('/login')
    return <main><a href={href}>Login</a>{children}</main>
  })
  .page('/dashboard', async () => 'dashboard')

type AppMustNotBecomeAny = IsAny<typeof app>
const appMustNotBecomeAny: AppMustNotBecomeAny = false
void appMustNotBecomeAny

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
`)).toEqual([])
})

test('router.href inside loader handlers still makes the app initializer circular', () => {
  expect(getDiagnosticsForCircularFixture(`
import { Spiceflow } from 'spiceflow'
import { router } from 'spiceflow/react'
import type { IsAny } from '../../types.ts'

export const app = new Spiceflow()
  .page('/login', async () => 'login')
  .loader('/dashboard', async () => {
    const href = router.href('/login')
    return { href }
  })
  .page('/dashboard', async () => 'dashboard')

type AppMustNotBecomeAny = IsAny<typeof app>
const appMustNotBecomeAny: AppMustNotBecomeAny = false
void appMustNotBecomeAny

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
`)).toMatchInlineSnapshot(`
  [
    "Type 'false' is not assignable to type 'true'.",
    "'app' is referenced directly or indirectly in its own type annotation.",
  ]
`)
})

test('router.href inside get handlers still makes the app initializer circular', () => {
  expect(getDiagnosticsForCircularFixture(`
import { Spiceflow } from 'spiceflow'
import { router } from 'spiceflow/react'
import type { IsAny } from '../../types.ts'

export const app = new Spiceflow()
  .page('/login', async () => 'login')
  .get('/api/login-url', async () => {
    const href = router.href('/login')
    return { href }
  })

type AppMustNotBecomeAny = IsAny<typeof app>
const appMustNotBecomeAny: AppMustNotBecomeAny = false
void appMustNotBecomeAny

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
`)).toMatchInlineSnapshot(`
  [
    "Type 'false' is not assignable to type 'true'.",
    "'app' is referenced directly or indirectly in its own type annotation.",
  ]
`)
})
