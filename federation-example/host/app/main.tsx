import { Suspense } from 'react'
import { Spiceflow } from 'spiceflow'
import { Head, RemoteComponent } from 'spiceflow/react'
import fs from 'fs'
import path from 'path'

const REMOTE_ORIGIN = process.env.REMOTE_ORIGIN || 'http://localhost:3051'

// Read the federation import map generated at build time
let importMapJson = '{"imports":{}}'
try {
  const distDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../client',
  )
  importMapJson = fs.readFileSync(
    path.join(distDir, 'federation-import-map.json'),
    'utf-8',
  )
} catch {
  // Dev mode or first build — import map not available yet
}

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <head>
          <script
            type="importmap"
            dangerouslySetInnerHTML={{ __html: importMapJson }}
          />
        </head>
        <Head>
          <Head.Title>Federation Host</Head.Title>
        </Head>
        <body>
          <div id="root">{children}</div>
        </body>
      </html>
    )
  })
  .page('/', async () => {
    return (
      <div>
        <h1 data-testid="host-title">Federation Host App</h1>
        <p>This page embeds a component from the remote server.</p>

        <div data-testid="remote-section">
          <h2>Remote Chart Component:</h2>
          <Suspense
            fallback={
              <div data-testid="remote-loading">
                Loading remote component...
              </div>
            }
          >
            <RemoteComponent
              src={`${REMOTE_ORIGIN}/api/chart`}
              dataSource="revenue"
            />
          </Suspense>
        </div>
      </div>
    )
  })

app.listen(Number(process.env.PORT || 3002))
