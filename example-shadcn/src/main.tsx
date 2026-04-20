import './globals.css'
import { Spiceflow, serveStatic } from 'spiceflow'
import { Head, ProgressBar } from 'spiceflow/react'
import PTable from 'example-shadcn/src/components/p-table-4.tsx'

export const app = new Spiceflow()
  .use(serveStatic({ root: './public' }))
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Spiceflow + shadcn/ui</Head.Title>
        </Head>
        <body className="min-h-screen bg-background font-sans antialiased">
          <ProgressBar />
          <main className="flex min-h-screen flex-col items-center px-6 py-12">
            {children}
          </main>
        </body>
      </html>
    )
  })
  .page('/', async function Home() {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Spiceflow + shadcn/ui
          </h1>
          <p className="text-muted-foreground text-center">
            Using{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              package.json exports
            </code>{' '}
            instead of tsconfig paths for component imports.
          </p>
        </div>
        <PTable />
      </div>
    )
  })

void app.listen(Number(process.env.PORT || 3000))

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
