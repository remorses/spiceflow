import './globals.css'
import { Spiceflow } from 'spiceflow'
import { sql } from '@vercel/postgres'
import { Suspense } from 'react'
import { Link } from 'spiceflow/dist/react/components'

const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <RootLayout>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </RootLayout>
    )
  })
  .page('/', async function Home() {
    const { rows } = await sql`SELECT * FROM pokemon ORDER BY RANDOM() LIMIT 12`

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
  .page('/pokemon/:id', async function PokemonDetails({ params: { id } }) {
    const { rows } = await sql`SELECT * FROM pokemon WHERE id = ${id}`
    const pokemon = rows[0]

    if (!pokemon) {
      return <div>Pokemon not found</div>
    }

    return (
      <div className="flex flex-col items-center p-4">
        <Pokemon id={pokemon.id} name={pokemon.name} />
        <a
          href="/"
          className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to list
        </a>
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

export default app
