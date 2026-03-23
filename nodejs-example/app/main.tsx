import './globals.css'
import { Spiceflow } from 'spiceflow'
import { Suspense } from 'react'
import { Link, ProgressBar, redirect } from 'spiceflow/react'

import { sql } from './db'
import { serveStatic } from 'spiceflow'

const aboutStats = [
  { label: 'Server components', value: 'Nested layouts + SSR' },
  { label: 'Runtime targets', value: 'Node, Bun, Workers' },
  { label: 'HTML strategy', value: 'Stream flight + inject payload' },
  { label: 'Benchmark focus', value: 'SSR and hydration cost' },
  { label: 'Data access', value: 'Direct Postgres queries' },
  { label: 'Transport', value: 'Web standard Request/Response' },
] as const

const aboutSections = [
  {
    title: 'Why this benchmark exists',
    body:
      'The goal is to measure how much work happens between a React Server Components payload and the final HTML that reaches the browser.',
  },
  {
    title: 'What the page exercises',
    body:
      'This route intentionally renders a larger tree with repeated cards, nested lists, and descriptive content so the benchmark stresses JSX creation and HTML output more than a tiny static paragraph would.',
  },
  {
    title: 'Why the route stays deterministic',
    body:
      'The content is static so cache hit rates are easy to reason about and benchmark results are not dominated by random per-request data differences.',
  },
  {
    title: 'What still matters',
    body:
      'Even with a cache, the shape of the component tree, the cost of SSR, and the amount of HTML written to the socket still affect throughput and latency.',
  },
] as const

const aboutFeatureCards = [
  'Route matching with nested layouts',
  'React Server Components decode on the server',
  'HTML stream generation from the flight payload',
  'Inline flight payload injection for hydration',
  'Redirect and not-found error propagation',
  'Header preservation across SSR responses',
  'Benchmark toggles for cache modes',
  'Byte-bounded LRU caching for HTML output',
  'Progressive hashing of the RSC flight stream',
  'Streaming fallback when the response is slow',
  'Client bootstrap injection with Vite RSC',
  'Static asset serving beside the RSC app',
] as const

const aboutFaqs = [
  {
    question: 'Does this page query the database?',
    answer:
      'No. The home page does. This route is intentionally deterministic so the benchmark can isolate rendering and caching behavior more clearly.',
  },
  {
    question: 'Why so much markup?',
    answer:
      'A tiny route makes it hard to see whether HTML-side optimizations matter. A larger tree increases the amount of JSX work and serialized HTML.',
  },
  {
    question: 'Why compare against Next.js and Hono?',
    answer:
      'They provide useful reference points: plain string HTML on one end and a popular RSC framework on the other.',
  },
  {
    question: 'What should improve with a good cache?',
    answer:
      'The ideal case is skipping expensive repeated work while preserving the existing streaming behavior for slow pages.',
  },
] as const

export const app = new Spiceflow()
  .use(serveStatic({ root: './public' }))
  .use(serveStatic({ root: './dist/client' })) // required to serve vite built static files
  .layout('/*', async ({ children }) => {
    return (
      <RootLayout>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </RootLayout>
    )
  })
  .page('/', async function Home() {
    const rows = await sql`SELECT * FROM pokemon ORDER BY RANDOM() LIMIT 12`
    return (
      <PokemonList>
        {rows.map((p) => (
          <Link href={`/pokemon/${p.id}`} key={p.id}>
            <Pokemon key={p.id} id={p.id} name={p.name} />
          </Link>
        ))}
      </PokemonList>
    )
  })
  .layout('/pokemon/:id', ({ children }) => {
    return (
      <div className="flex flex-col items-center p-4">
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </div>
    )
  })
  .page('/redirect-test', async function RedirectTest() {
    throw redirect('/about')
  })
  .page('/about', async function About() {
    return (
      <div className="flex flex-col gap-8 p-8 max-w-5xl">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold">About</h2>
          <p className="max-w-3xl text-center text-gray-600 dark:text-gray-300">
            This is a demo app built with{' '}
            <a href="https://github.com/nicedoc/spiceflow" className="underline">
              Spiceflow
            </a>
            , showcasing React Server Components with direct database queries from
            the component tree. This benchmark version intentionally renders more
            JSX so the cost of SSR and HTML generation is easier to observe.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {aboutStats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</span>
              <strong className="text-sm text-gray-900 dark:text-gray-100">{stat.value}</strong>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {aboutSections.map((section) => (
            <article key={section.title} className="flex flex-col gap-2 rounded-lg border border-gray-300 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-900/40">
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Render workload</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aboutFeatureCards.map((feature, index) => (
              <div key={feature} className="flex flex-col gap-2 rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
                <span className="text-xs uppercase tracking-wide text-gray-500">Step {index + 1}</span>
                <strong className="text-sm">{feature}</strong>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Repeated card markup increases the amount of JSX the server must
                  turn into HTML for every request in this benchmark route.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Benchmark FAQ</h3>
          <div className="flex flex-col gap-3">
            {aboutFaqs.map((faq) => (
              <article key={faq.question} className="flex flex-col gap-2 rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900/40">
                <h4 className="font-medium">{faq.question}</h4>
                <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="flex justify-center">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  })
  .page('/pokemon/:id', async function PokemonDetails({ params: { id } }) {
    const rows = await sql`SELECT * FROM pokemon WHERE id = ${Number(id)}`
    const pokemon = rows[0]

    if (!pokemon) {
      return <div>Pokemon not found</div>
    }

    return (
      <div className="flex flex-col items-center p-4">
        <Pokemon id={pokemon.id} name={pokemon.name} />
        <Link
          href="/"
          className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to list
        </Link>
      </div>
    )
  })

function Loading() {
  return (
    <ul className="max-w-md flex flex-wrap justify-center gap-4 p-4 m-3">
      {[...Array(12)].map((_, i) => (
        <li
          key={i}
          className="flex flex-col items-center justify-center border bg-white border-gray-400 dark:bg-gray-700 dark:border-gray-500 p-3"
        >
          <div style={{ width: 96, height: 96 }} />
          <span aria-hidden className="invisible">
            Loading
          </span>
        </li>
      ))}
    </ul>
  )
}

function PokemonList({ children }) {
  return (
    <ul className="max-w-md flex flex-wrap justify-center gap-4 p-4 m-3">
      {children}
    </ul>
  )
}

function Pokemon({ id, name }) {
  return (
    <li className="flex flex-col items-center justify-center border bg-white border-gray-400 dark:bg-gray-700 dark:border-gray-500 p-3">
      <img
        width={96}
        height={96}
        alt={name}
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
      />
      {name}
    </li>
  )
}

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <title>How is this not illegal?</title>
      <meta
        name="description"
        content="Querying Postgres directly from your components"
      />
      <meta property="og:title" content="How is this not illegal?" />
      <meta
        property="og:description"
        content="Querying Postgres directly from your components"
      />
      <meta property="og:url" content="/test" />
      <meta property="og:site_name" content="How is this not illegal?" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@rauchg" />
      <meta name="twitter:creator" content="@rauchg" />

      <body>
        <ProgressBar />
        <main className="flex min-h-screen flex-col items-center flex-start px-6 pt-6">
          <h1 className="text-3xl font-bold mb-3">How is this not illegal?</h1>
          <p className="text-center">
            This page renders{' '}
            <code className="py-0.5 px-1 text-sm rounded-md border border-gray-300 bg-gray-100 dark:bg-[#444] dark:border-[#666]">
              SELECT * FROM pokemon ORDER BY RANDOM() LIMIT 12
            </code>{' '}
            from the edge, for every request.
          </p>
          <p className="mt-2 text-center">
            What&apos;s best, the data fetching is defined directly within the
            component tree thanks to React Server Components.{' '}
            <a
              href="https://twitter.com/dan_abramov/status/1341217154566402050"
              target="_blank"
              className="underline"
            >
              Legally
            </a>
            . (
            <a
              className="underline"
              target="_blank"
              href="https://github.com/rauchg/how-is-this-not-illegal"
            >
              Source
            </a>
            )
          </p>
          {children}
        </main>

        <footer className="text-xs p-5 text-center text-gray-600">
          Images courtesy of{' '}
          <a
            target="_blank"
            className="underline"
            href="https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon"
          >
            PokeAPI
          </a>{' '}
          – Pokemon is © 1996-2023 Nintendo, Creatures, Inc., GAME FREAK
        </footer>
      </body>
    </html>
  )
}


app.listen(Number(process.env.PORT || 3000))
