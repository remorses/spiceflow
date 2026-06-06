import { FederationDemo } from './federation-demo'

export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>Next.js Federation Consumer</h1>
      <p>This Next.js app consumes federation payloads from a remote spiceflow server.</p>
      <FederationDemo />
    </main>
  )
}
