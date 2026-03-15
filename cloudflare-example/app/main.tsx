// Spiceflow RSC app on Cloudflare Workers with KV.
// The default export is the Worker entry point — app.handle() returns HTML
// for document requests via conditional package exports (react-server → SSR bridge).
import './globals.css'
import { Spiceflow } from 'spiceflow'
import { Suspense } from 'react'
import { Link, ProgressBar } from 'spiceflow/react'
import { env } from 'cloudflare:workers'

interface Env {
  POKEMON_KV: KVNamespace
}

type Pokemon = {
  id: number
  name: string
  type: string
}

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <RootLayout>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </RootLayout>
    )
  })
  .page('/', async function Home() {
    const kv = (env as unknown as Env).POKEMON_KV
    const allIds: number[] = JSON.parse((await kv.get('__ids')) || '[]')

    // Pick 12 random IDs
    const shuffled = allIds.sort(() => Math.random() - 0.5).slice(0, 12)
    const pokemon = await Promise.all(
      shuffled.map(async (id) => {
        const data = await kv.get(`pokemon:${id}`, 'json')
        return data as Pokemon
      }),
    )

    return (
      <PokemonList>
        {pokemon.filter(Boolean).map((p) => (
          <Link href={`/pokemon/${p.id}`} key={p.id}>
            <PokemonCard id={p.id} name={p.name} />
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
    const kv = (env as unknown as Env).POKEMON_KV
    const pokemon = await kv.get<Pokemon>(`pokemon:${Number(id)}`, 'json')

    if (!pokemon) {
      return <div>Pokemon not found</div>
    }

    return (
      <div className="flex flex-col items-center p-4">
        <PokemonCard id={pokemon.id} name={pokemon.name} />
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

function PokemonList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="max-w-md flex flex-wrap justify-center gap-4 p-4 m-3">
      {children}
    </ul>
  )
}

function PokemonCard({ id, name }: { id: number; name: string }) {
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
      <title>How is this not illegal? (Cloudflare KV edition)</title>
      <meta
        name="description"
        content="Querying Cloudflare KV directly from your components"
      />
      <body>
        <ProgressBar />
        <main className="flex min-h-screen flex-col items-center flex-start px-6 pt-6">
          <h1 className="text-3xl font-bold mb-3">
            How is this not illegal?
          </h1>
          <p className="text-center">
            This page reads{' '}
            <code className="py-0.5 px-1 text-sm rounded-md border border-gray-300 bg-gray-100 dark:bg-[#444] dark:border-[#666]">
              POKEMON_KV
            </code>{' '}
            from Cloudflare Workers KV, for every request.
          </p>
          <p className="mt-2 text-center">
            Data fetching is defined directly within the component tree thanks
            to React Server Components.
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


// Worker default export — user controls the entry, framework stays runtime-agnostic
export default {
  async fetch(request: Request) {
    return app.handle(request)
  },
}
