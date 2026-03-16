import Link from 'next/link'

// Force dynamic rendering so RSC runs on every request (fair comparison)
export const dynamic = 'force-dynamic'

export default function About() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        padding: '2rem',
        maxWidth: '32rem',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>About</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>
        This is a demo app built with Next.js, showcasing React Server
        Components for performance comparison.
      </p>
      <Link
        href="/"
        style={{
          padding: '0.5rem 1rem',
          border: '1px solid #ccc',
          borderRadius: '0.375rem',
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
