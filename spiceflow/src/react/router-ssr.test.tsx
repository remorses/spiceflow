import { describe, expect, test } from 'vitest'
import React from 'react'
import ReactDOMServer from 'react-dom/server.edge'
import { createRouterContextData, routerContextStorage } from '#router-context'
import { Spiceflow } from '../spiceflow.js'
import {
  getRouter,
  router,
  useLoaderData,
  useRouterState,
} from './index.ts'

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode()
  return result
}

const app = new Spiceflow()
  .loader('/dashboard', async (): Promise<DashboardData> => ({
    session: { user: { name: 'Ada' } },
  }))
  .page('/dashboard', async () => 'dashboard')

type DashboardData = { session: { user: { name: string } } }

const typedRouter = getRouter<typeof app>()

function HookProbe() {
  const data = useLoaderData<typeof app>('/dashboard')
  const state = useRouterState()

  return (
    <pre>
      {JSON.stringify({
        hookPathname: state.pathname,
        hookSearchTab: state.searchParams.get('tab'),
        hookUserName: data.session.user.name,
      })}
    </pre>
  )
}

async function SsrProbe() {
  const data = await typedRouter.getLoaderData()
  const typedData = await typedRouter.getLoaderData('/dashboard')

  return (
    <>
      <pre>
        {JSON.stringify({
          pathname: router.pathname,
          locationPathname: router.location.pathname,
          locationSearch: router.location.search,
          locationHash: router.location.hash,
          searchTab: router.searchParams.get('tab'),
          userName: data.session.user.name,
          typedUserName: typedData.session.user.name,
        })}
      </pre>
      <HookProbe />
    </>
  )
}

describe('router APIs in SSR', () => {
  test('getLoaderData and request-backed router fields work during SSR render', async () => {
    const request = new Request('https://example.com/dashboard?tab=profile#bio')
    const context = createRouterContextData(request)
    context.loaderData = {
      session: { user: { name: 'Ada' } },
    }

    const htmlStream = await routerContextStorage.run(
      context,
      () => ReactDOMServer.renderToReadableStream(<SsrProbe />),
    )
    const html = await readStream(htmlStream)

    expect(html).toContain('&quot;pathname&quot;:&quot;/dashboard&quot;')
    expect(html).toContain('&quot;locationPathname&quot;:&quot;/dashboard&quot;')
    expect(html).toContain('&quot;locationSearch&quot;:&quot;?tab=profile&quot;')
    expect(html).toContain('&quot;locationHash&quot;:&quot;#bio&quot;')
    expect(html).toContain('&quot;searchTab&quot;:&quot;profile&quot;')
    expect(html).toContain('&quot;userName&quot;:&quot;Ada&quot;')
    expect(html).toContain('&quot;typedUserName&quot;:&quot;Ada&quot;')
    expect(html).toContain('&quot;hookPathname&quot;:&quot;/dashboard&quot;')
    expect(html).toContain('&quot;hookSearchTab&quot;:&quot;profile&quot;')
    expect(html).toContain('&quot;hookUserName&quot;:&quot;Ada&quot;')
  })

  test('request and loader data stay isolated across concurrent SSR renders', async () => {
    async function render(args: { name: string; search: string }) {
      const request = new Request(`https://example.com/dashboard?tab=${args.search}`)
      const context = createRouterContextData(request)
      context.loaderData = {
        session: { user: { name: args.name } },
      }
      const stream = await routerContextStorage.run(
        context,
        () => ReactDOMServer.renderToReadableStream(<SsrProbe />),
      )
      return readStream(stream)
    }

    const [adaHtml, graceHtml] = await Promise.all([
      render({ name: 'Ada', search: 'profile' }),
      render({ name: 'Grace', search: 'settings' }),
    ])

    expect(adaHtml).toContain('&quot;userName&quot;:&quot;Ada&quot;')
    expect(adaHtml).toContain('&quot;searchTab&quot;:&quot;profile&quot;')
    expect(graceHtml).toContain('&quot;userName&quot;:&quot;Grace&quot;')
    expect(graceHtml).toContain('&quot;searchTab&quot;:&quot;settings&quot;')
  })
})
