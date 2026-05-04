// Spiceflow app for vitest integration testing.
// Tests call app.handle() directly to verify page and API route responses.
import { Spiceflow } from 'spiceflow'
import { Head } from 'spiceflow/react'

export const app = new Spiceflow()
  .get('/api/hello', () => ({ message: 'hello world' }))
  .get('/api/greet/:name', ({ params }) => ({
    greeting: `hello ${params.name}`,
  }))
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Vitest Example</Head.Title>
        </Head>
        <body>{children}</body>
      </html>
    )
  })
  .page('/', async function Home() {
    return (
      <div>
        <h1>Home</h1>
        <p>Welcome to spiceflow</p>
      </div>
    )
  })
  .page('/about', async function About() {
    return (
      <div>
        <h1>About</h1>
        <p>This is the about page</p>
      </div>
    )
  })
  .page('/users/:id', async function UserPage({ params }) {
    return (
      <div>
        <h1>User {params.id}</h1>
        <p>Profile page for user {params.id}</p>
      </div>
    )
  })
  .page('/redirect-page', async () => {
    const { redirect } = await import('spiceflow')
    throw redirect('/about')
  })
  .page('/error-page', async () => {
    throw new Error('page exploded')
  })

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
