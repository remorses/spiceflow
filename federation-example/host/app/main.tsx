import { Suspense } from 'react'
import { Spiceflow } from 'spiceflow'
import { Head, RemoteComponent } from 'spiceflow/react'

const REMOTE_ORIGIN = process.env.REMOTE_ORIGIN || 'http://localhost:3051'

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
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
              props={{ dataSource: 'revenue' }}
            />
          </Suspense>
        </div>

        <div data-testid="esm-section">
          <h2>ESM Component:</h2>
          <Suspense
            fallback={
              <div data-testid="esm-loading">
                Loading ESM component...
              </div>
            }
          >
            <RemoteComponent
              src={`${REMOTE_ORIGIN}/api/esm-component.js`}
              props={{ name: 'Spiceflow' }}
            />
          </Suspense>
        </div>
      </div>
    )
  })

app.listen(Number(process.env.PORT || 3002))
