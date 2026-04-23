// Spiceflow app that serves both a website and an MCP server endpoint.
// The website is a normal Spiceflow RSC app with pages.
// The /mcp endpoint handles MCP protocol requests (tools, resources).
import './globals.css'
import { Spiceflow } from 'spiceflow'
import { Head, Link, ProgressBar } from 'spiceflow/react'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from './mcp-server.js'

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang='en'>
        <Head>
          <Head.Title>Spiceflow MCP App</Head.Title>
        </Head>
        <body>
          <ProgressBar />
          <main className='flex min-h-screen flex-col items-center px-6 pt-10'>
            {children}
          </main>
        </body>
      </html>
    )
  })
  .page('/', async function Home() {
    return (
      <div className='flex flex-col items-center gap-6 max-w-lg text-center'>
        <h1 className='text-3xl font-bold'>Spiceflow MCP App</h1>
        <p className='text-gray-600 dark:text-gray-300'>
          This app is both a <strong>website</strong> (what you see here) and an{' '}
          <strong>MCP server</strong> that Claude, ChatGPT, and other LLM hosts
          can connect to.
        </p>

        <div className='flex flex-col gap-3 w-full text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-5'>
          <h2 className='text-lg font-semibold'>MCP tools</h2>
          <ul className='list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 flex flex-col gap-1'>
            <li>
              <code>geocode</code> — search for places by name
            </li>
            <li>
              <code>show-map</code> — display an interactive Leaflet map in the
              chat
            </li>
          </ul>
        </div>

        <div className='flex flex-col gap-3 w-full text-left bg-blue-50 dark:bg-blue-900/30 rounded-lg p-5'>
          <h2 className='text-lg font-semibold'>Connect to this server</h2>
          <p className='text-sm text-gray-700 dark:text-gray-300'>
            Add as a custom connector with endpoint:
          </p>
          <code className='text-sm bg-white dark:bg-gray-700 rounded px-3 py-2 block'>
            http://localhost:3000/mcp
          </code>
        </div>

        <Link
          href='/about'
          className='px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100'
        >
          About this example
        </Link>
      </div>
    )
  })
  .page('/about', async function About() {
    return (
      <div className='flex flex-col items-center gap-4 max-w-lg text-center'>
        <h2 className='text-2xl font-bold'>About</h2>
        <p className='text-gray-600 dark:text-gray-300'>
          This example shows how a single Spiceflow app can serve a website with
          React Server Components <em>and</em> act as an MCP server with
          interactive UI apps that render inline in LLM chat clients.
        </p>
        <Link
          href='/'
          className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
        >
          Back home
        </Link>
      </div>
    )
  })
  // MCP endpoint: handles the Model Context Protocol over HTTP
  .post('/mcp', async ({ request }) => {
    const server = createMcpServer()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    // We need to adapt from Web Request/Response to the Node.js-style
    // req/res that StreamableHTTPServerTransport.handleRequest expects.
    const body = await request.json()

    // Create a minimal Node.js-compatible response wrapper
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const headers: Record<string, string> = {}
    let statusCode = 200
    let headersSent = false

    const fakeRes = {
      statusCode,
      headersSent: false,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value
      },
      writeHead(code: number, hdrs?: Record<string, string>) {
        statusCode = code
        if (hdrs) {
          for (const [k, v] of Object.entries(hdrs)) {
            headers[k.toLowerCase()] = v
          }
        }
        headersSent = true
        fakeRes.headersSent = true
        return fakeRes
      },
      write(chunk: string | Buffer) {
        const data =
          typeof chunk === 'string'
            ? new TextEncoder().encode(chunk)
            : new Uint8Array(chunk)
        writer.write(data)
        return true
      },
      end(chunk?: string | Buffer) {
        if (chunk) fakeRes.write(chunk)
        writer.close()
      },
      on(_event: string, _handler: Function) {
        return fakeRes
      },
      once(_event: string, _handler: Function) {
        return fakeRes
      },
      emit(_event: string, ..._args: unknown[]) {
        return true
      },
      removeListener(_event: string, _handler: Function) {
        return fakeRes
      },
      get writableEnded() {
        return false
      },
      get writableFinished() {
        return false
      },
      // Support status() for express-like usage
      status(code: number) {
        statusCode = code
        return fakeRes
      },
      json(data: unknown) {
        headers['content-type'] = 'application/json'
        fakeRes.end(JSON.stringify(data))
      },
    }

    const fakeReq = {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      url: new URL(request.url).pathname,
      body,
    }

    try {
      await server.connect(transport)
      await transport.handleRequest(fakeReq as any, fakeRes as any, body)
    } catch (error) {
      console.error('MCP error:', error)
      if (!headersSent) {
        return Response.json(
          {
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          },
          { status: 500 },
        )
      }
    }

    return new Response(readable, {
      status: statusCode,
      headers,
    })
  })

const port = Number(process.env.PORT || 3000)
void app.listen(port)
console.log(`Spiceflow MCP App listening on http://localhost:${port}`)
console.log(`MCP endpoint: http://localhost:${port}/mcp`)

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
