// Spiceflow RSC website entry point.
// Renders the README as MDX docs with Code Hike syntax highlighting.
import './global.css'
import { Spiceflow } from 'spiceflow'
import { Link, ProgressBar } from 'spiceflow/react'
import { mcp } from 'spiceflow/mcp'
import { openapi } from 'spiceflow/openapi'
import readmeRaw from './readme.mdx?raw'
import { ReadmeContent } from './readme-content'

const apiApp = new Spiceflow({ basePath: '/api' })
  .use(openapi())
  .use(mcp({ path: '/mcp' }))
  .get('/', () => 'Hello, World!')
  .get('/hello', () => 'Hello, World!')
  .post('/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })

export const app = new Spiceflow()
  .use(({ request }) => {
    const url = new URL(request.url)
    const userAgent = request.headers.get('user-agent') || ''

    // Serve raw readme for AI agents
    const isAIAgent =
      userAgent.toLowerCase().includes('claude') ||
      userAgent.toLowerCase().includes('opencode') ||
      userAgent.toLowerCase().includes('anthropic') ||
      userAgent.toLowerCase().includes('ai-agent') ||
      request.headers.get('x-ai-agent') !== null ||
      (userAgent.includes('curl') && url.searchParams.get('agent') === 'ai')

    if (isAIAgent && (url.pathname === '/' || url.pathname === '')) {
      return Response.redirect(new URL('/readme.md', url.origin).href, 302)
    }

    // Handle API routes via sub-app before layout matching
    if (url.pathname.startsWith('/api')) {
      return apiApp.handle(request)
    }

    // Serve llms.txt as plain text
    if (url.pathname === '/llms.txt') {
      return new Response(readmeRaw, {
        headers: { 'Content-Type': 'text/plain' },
      })
    }
  })
  .layout('/*', ({ children }) => {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          <title>Spiceflow - The Type Safe TypeScript API Framework</title>
          <meta
            name="description"
            content="Spiceflow is a lightweight, type-safe API framework for building web services using modern web standards."
          />
        </head>
        <body>
          <ProgressBar />
          {children}
        </body>
      </html>
    )
  })
  .page('/', () => {
    return (
      <div className="px-6 md:px-12 pt-12 pb-24 md:pt-24 w-full flex flex-col items-center">
        <div className="prose dark:prose-invert prose-quoteless gap-1 flex flex-col min-w-0 w-full max-w-[900px]">
          <ReadmeContent />
        </div>
        <div className="pt-24 flex flex-col text-sm items-center gap-4 dark:text-gray-400">
          <div>
            Written by{' '}
            <a className="underline" href="https://twitter.com/__morse">
              @__morse
            </a>
          </div>
          <a
            className="underline"
            href="https://github.com/remorses/spiceflow/edit/main/README.md"
          >
            Edit on GitHub
          </a>
        </div>
      </div>
    )
  })
export default {
  async fetch(request: Request) {
    return app.handle(request)
  },
}
