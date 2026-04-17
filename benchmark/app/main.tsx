import './globals.css'
import { Spiceflow } from 'spiceflow'
import { Suspense } from 'react'
import { Head, Link, ProgressBar, redirect } from 'spiceflow/react'

import { serveStatic } from 'spiceflow'

const pokemon = [
  { id: 1, name: 'Bulbasaur' },
  { id: 4, name: 'Charmander' },
  { id: 7, name: 'Squirtle' },
  { id: 25, name: 'Pikachu' },
  { id: 39, name: 'Jigglypuff' },
  { id: 52, name: 'Meowth' },
  { id: 133, name: 'Eevee' },
  { id: 143, name: 'Snorlax' },
  { id: 150, name: 'Mewtwo' },
  { id: 151, name: 'Mew' },
  { id: 249, name: 'Lugia' },
  { id: 384, name: 'Rayquaza' },
]

function getRandomPokemon(count: number) {
  const shuffled = [...pokemon].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export const app = new Spiceflow()
  .use(serveStatic({ root: './public' }))
  .layout('/*', async ({ children }) => {
    return (
      <RootLayout>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </RootLayout>
    )
  })
  .page('/', async function Home() {
    const rows = getRandomPokemon(12)
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
      <div className="flex flex-col items-center gap-4 p-8 max-w-lg">
        <h2 className="text-2xl font-bold">About</h2>
        <p className="text-center text-gray-600 dark:text-gray-300">
          This is a demo app built with Spiceflow, showcasing React Server
          Components.
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to home
        </Link>
      </div>
    )
  })
  .page('/pokemon/:id', async function PokemonDetails({ params: { id } }) {
    const match = pokemon.find((p) => p.id === Number(id))

    if (!match) {
      return <div>Pokemon not found</div>
    }

    return (
      <div className="flex flex-col items-center p-4">
        <Pokemon id={match.id} name={match.name} />
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
      <Head>
        <Head.Title>Spiceflow Benchmark</Head.Title>
      </Head>

      <body>
        <ProgressBar />
        <main className="flex min-h-screen flex-col items-center flex-start px-6 pt-6">
          <h1 className="text-3xl font-bold mb-3">Spiceflow Benchmark</h1>
          {children}
        </main>
      </body>
    </html>
  )
}

void app.listen(Number(process.env.PORT || 3000))
