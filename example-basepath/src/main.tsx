// Minimal docs-style spiceflow app served under /docs base path.
// Built with `vite build`, can run standalone or be mounted inside another
// framework (like Next.js) by importing the dist entry and calling app.handle().
import './globals.css'
import { Spiceflow } from 'spiceflow'
import { Head, Link, ProgressBar } from 'spiceflow/react'

const sections = [
  {
    title: 'Getting Started',
    href: '/getting-started',
    description: 'Install Spiceflow and create your first app in under five minutes.',
  },
  {
    title: 'Routing',
    href: '/routing',
    description: 'Pages, layouts, API routes, and how they compose together.',
  },
  {
    title: 'API Reference',
    href: '/api-reference',
    description: 'Complete reference for every Spiceflow method and option.',
  },
]

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Spiceflow Docs</Head.Title>
          <Head.Meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <body className="min-h-screen bg-background font-sans antialiased">
          <ProgressBar />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 px-8 py-12 max-w-3xl">{children}</main>
          </div>
        </body>
      </html>
    )
  })
  .page('/', async function DocsHome() {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Learn how to build type-safe APIs and full-stack React apps with Spiceflow.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col gap-1.5 rounded-lg border px-5 py-4 transition-colors hover:bg-accent"
            >
              <span className="font-semibold group-hover:text-primary">{s.title}</span>
              <span className="text-sm text-muted-foreground">{s.description}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  })
  .page('/getting-started', async function GettingStarted() {
    return (
      <article className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Spiceflow is a type-safe API framework and full-stack React RSC framework.
          It works on Node.js, Bun, and Cloudflare Workers.
        </p>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Installation</h2>
          <pre className="rounded-lg bg-accent px-4 py-3 text-sm font-mono overflow-x-auto">
            npm create spiceflow
          </pre>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Your first app</h2>
          <pre className="rounded-lg bg-accent px-4 py-3 text-sm font-mono overflow-x-auto whitespace-pre">{`import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .get('/hello', () => 'Hello World')

app.listen(3000)`}</pre>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Next steps</h2>
          <p className="text-muted-foreground leading-relaxed">
            Check out the <Link href="/routing" className="underline hover:text-foreground">Routing</Link> guide
            to learn about pages, layouts, and API routes.
          </p>
        </section>
      </article>
    )
  })
  .page('/routing', async function Routing() {
    return (
      <article className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Routing</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Spiceflow uses a chainable API to define routes. Pages render React Server Components,
          API routes return data, and layouts wrap pages with shared UI.
        </p>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Pages</h2>
          <pre className="rounded-lg bg-accent px-4 py-3 text-sm font-mono overflow-x-auto whitespace-pre">{`app.page('/about', async function About() {
  return <h1>About</h1>
})`}</pre>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">API Routes</h2>
          <pre className="rounded-lg bg-accent px-4 py-3 text-sm font-mono overflow-x-auto whitespace-pre">{`app.get('/api/users', () => {
  return [{ id: 1, name: 'Alice' }]
})`}</pre>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Layouts</h2>
          <pre className="rounded-lg bg-accent px-4 py-3 text-sm font-mono overflow-x-auto whitespace-pre">{`app.layout('/*', async ({ children }) => {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
})`}</pre>
        </section>
      </article>
    )
  })
  .page('/api-reference', async function ApiReference() {
    const methods = [
      { name: '.page(path, handler)', desc: 'Define a page route with React Server Components' },
      { name: '.get(path, handler)', desc: 'Define a GET API route' },
      { name: '.post(path, handler)', desc: 'Define a POST API route' },
      { name: '.layout(path, handler)', desc: 'Define a layout that wraps matching pages' },
      { name: '.use(middleware)', desc: 'Add middleware to the app' },
      { name: '.handle(request)', desc: 'Handle a web standard Request and return a Response' },
      { name: '.listen(port)', desc: 'Start the HTTP server' },
    ]
    return (
      <article className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Complete reference for the Spiceflow class methods.
        </p>
        <div className="flex flex-col gap-0 border rounded-lg overflow-hidden">
          {methods.map((m, i) => (
            <div
              key={m.name}
              className={`flex flex-col gap-1 px-5 py-3.5 ${i > 0 ? 'border-t' : ''}`}
            >
              <code className="text-sm font-mono font-semibold">{m.name}</code>
              <span className="text-sm text-muted-foreground">{m.desc}</span>
            </div>
          ))}
        </div>
      </article>
    )
  })

if ((import.meta as ImportMeta & { main?: boolean }).main) {
  void app.listen(Number(process.env.PORT || 3000))
}

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}

function Sidebar() {
  return (
    <nav className="hidden md:flex w-56 shrink-0 flex-col gap-1 border-r px-4 py-12">
      <Link
        href="/"
        className="text-lg font-bold tracking-tight px-2 pb-4"
      >
        Spiceflow
      </Link>
      {sections.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
        >
          {s.title}
        </Link>
      ))}
    </nav>
  )
}
