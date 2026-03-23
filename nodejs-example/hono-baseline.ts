// Minimal Hono server as a performance baseline for comparison.
// Returns the same HTML structure as the /about RSC page but
// with zero React/RSC overhead — just string concatenation.

import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

const aboutStats = [
  { label: 'Server components', value: 'Nested layouts + SSR' },
  { label: 'Runtime targets', value: 'Node, Bun, Workers' },
  { label: 'HTML strategy', value: 'Stream flight + inject payload' },
  { label: 'Benchmark focus', value: 'SSR and hydration cost' },
  { label: 'Data access', value: 'Direct Postgres queries' },
  { label: 'Transport', value: 'Web standard Request/Response' },
]

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
]

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
]

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
]

const html = `<!DOCTYPE html>
<html lang="en">
<head><title>About - Hono baseline</title></head>
<body>
  <main style="display:flex;flex-direction:column;align-items:center;padding:2rem;gap:2rem">
    <h1>How is this not illegal?</h1>
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:2rem;max-width:72rem">
      <h2>About</h2>
      <p style="text-align:center;color:#666;line-height:1.7;max-width:48rem">
        This is a demo app built with Spiceflow, showcasing React Server Components
        with direct database queries from the component tree. This benchmark version
        intentionally renders more JSX so the cost of SSR and HTML generation is
        easier to observe.
      </p>
      <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.75rem;width:100%">
        ${aboutStats.map((stat) => `
          <div style="display:flex;flex-direction:column;gap:0.25rem;border:1px solid #ccc;border-radius:0.75rem;padding:1rem;background:#fff">
            <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:#666">${stat.label}</span>
            <strong style="font-size:0.9rem">${stat.value}</strong>
          </div>
        `).join('')}
      </section>
      <section style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;width:100%">
        ${aboutSections.map((section) => `
          <article style="display:flex;flex-direction:column;gap:0.5rem;border:1px solid #ddd;border-radius:0.75rem;padding:1.25rem;background:#f8f8f8">
            <h3 style="font-size:1.1rem;font-weight:600">${section.title}</h3>
            <p style="color:#666;line-height:1.7">${section.body}</p>
          </article>
        `).join('')}
      </section>
      <section style="display:flex;flex-direction:column;gap:0.75rem;width:100%">
        <h3 style="font-size:1.1rem;font-weight:600">Render workload</h3>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.75rem;width:100%">
          ${aboutFeatureCards.map((feature, index) => `
            <div style="display:flex;flex-direction:column;gap:0.5rem;border:1px solid #ccc;border-radius:0.75rem;padding:1rem;background:#fff">
              <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:#666">Step ${index + 1}</span>
              <strong style="font-size:0.95rem">${feature}</strong>
              <p style="color:#666;line-height:1.6">
                Repeated card markup increases the amount of JSX the server must
                turn into HTML for every request in this benchmark route.
              </p>
            </div>
          `).join('')}
        </div>
      </section>
      <section style="display:flex;flex-direction:column;gap:0.75rem;width:100%">
        <h3 style="font-size:1.1rem;font-weight:600">Benchmark FAQ</h3>
        <div style="display:flex;flex-direction:column;gap:0.75rem;width:100%">
          ${aboutFaqs.map((faq) => `
            <article style="display:flex;flex-direction:column;gap:0.5rem;border:1px solid #ddd;border-radius:0.75rem;padding:1rem;background:#f8f8f8">
              <h4 style="font-weight:600">${faq.question}</h4>
              <p style="color:#666;line-height:1.7">${faq.answer}</p>
            </article>
          `).join('')}
        </div>
      </section>
      <a href="/" style="padding:0.5rem 1rem;border:1px solid #ccc;border-radius:0.375rem">
        Back to home
      </a>
    </div>
  </main>
</body>
</html>`

app.get('/about', (c) => c.html(html))
app.get('/redirect-test', (c) => c.redirect('/about', 307))
app.get('/health', (c) => c.json({ status: 'ok' }))

const port = Number(process.env.HONO_PORT || 3322)
console.log(`Hono baseline listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
