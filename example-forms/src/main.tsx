// Spiceflow forms example. Demonstrates the recommended pattern: client-side
// parseFormData validation with Zod, then calling imported server actions.
// Covers: validation errors, server errors, returned data, redirects,
// inline error boundaries, and direct action calls.

import './globals.css'
import { Spiceflow } from 'spiceflow'
import { Head, Link, ProgressBar } from 'spiceflow/react'
import {
  ClientValidationForm,
  ServerErrorForm,
  ReturnDataForm,
  RedirectForm,
  InlineErrorForm,
} from './app/form-components.tsx'

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Spiceflow Forms</Head.Title>
        </Head>
        <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
          <ProgressBar />
          <main className="mx-auto max-w-2xl px-6 py-12">
            <nav className="mb-8 flex gap-4 text-sm">
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
              <Link href="/success" className="text-blue-600 hover:underline">
                Success Page
              </Link>
            </nav>
            {children}
          </main>
        </body>
      </html>
    )
  })
  .page('/', async () => {
    return (
      <div className="flex flex-col gap-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Spiceflow Forms
          </h1>
          <p className="text-gray-500">
            Client-side validation with Zod + parseFormData, then server
            action calls. Each form imports its schema and action from a
            shared <code className="text-xs bg-gray-100 px-1 rounded">actions.ts</code> file.
          </p>
        </div>

        <Section title="1. Client Validation Error → ErrorBoundary">
          <ClientValidationForm />
        </Section>

        <Section title="2. Server Action Throws → ErrorBoundary">
          <ServerErrorForm />
        </Section>

        <Section title="3. Action Returns Data → setState">
          <ReturnDataForm />
        </Section>

        <Section title="4. Action Redirects">
          <RedirectForm />
        </Section>

        <Section title="5. ErrorBoundary below (No Layout Shift)">
          <InlineErrorForm />
        </Section>


      </div>
    )
  })
  .page('/success', async ({ request }) => {
    const url = new URL(request.url)
    const name = url.searchParams.get('name') || 'Unknown'
    const id = url.searchParams.get('id') || '???'
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Project Created!</h1>
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          <strong>{name}</strong> (id: {id}) was created successfully.
          The server action threw <code className="text-xs bg-green-100 px-1 rounded">redirect()</code> to
          navigate here.
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:underline self-start"
        >
          ← Back to forms
        </Link>
      </div>
    )
  })

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold border-b border-gray-200 pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

void app.listen(Number(process.env.PORT || 3000))

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
