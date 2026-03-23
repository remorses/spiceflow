import Link from 'next/link'

// Force dynamic rendering so RSC runs on every request (fair comparison)
export const dynamic = 'force-dynamic'

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

export default function About() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        padding: '2rem',
        maxWidth: '72rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '48rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>About</h2>
        <p style={{ textAlign: 'center', color: '#666', lineHeight: 1.7 }}>
          This is a demo app built with Next.js, showcasing React Server
          Components for performance comparison. This benchmark version
          intentionally renders more JSX so the cost of SSR and HTML generation
          is easier to observe.
        </p>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '0.75rem',
          width: '100%',
        }}
      >
        {aboutStats.map((stat) => (
          <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid #ccc', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666' }}>{stat.label}</span>
            <strong style={{ fontSize: '0.9rem' }}>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1rem',
          width: '100%',
        }}
      >
        {aboutSections.map((section) => (
          <article key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #ddd', borderRadius: '0.75rem', padding: '1.25rem', background: '#f8f8f8' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{section.title}</h3>
            <p style={{ color: '#666', lineHeight: 1.7 }}>{section.body}</p>
          </article>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Render workload</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '0.75rem',
            width: '100%',
          }}
        >
          {aboutFeatureCards.map((feature, index) => (
            <div key={feature} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #ccc', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666' }}>Step {index + 1}</span>
              <strong style={{ fontSize: '0.95rem' }}>{feature}</strong>
              <p style={{ color: '#666', lineHeight: 1.6 }}>
                Repeated card markup increases the amount of JSX the server must
                turn into HTML for every request in this benchmark route.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Benchmark FAQ</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          {aboutFaqs.map((faq) => (
            <article key={faq.question} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #ddd', borderRadius: '0.75rem', padding: '1rem', background: '#f8f8f8' }}>
              <h4 style={{ fontWeight: 600 }}>{faq.question}</h4>
              <p style={{ color: '#666', lineHeight: 1.7 }}>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

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
