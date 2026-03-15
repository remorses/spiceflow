// Minimal Hono server as a performance baseline for comparison.
// Returns the same HTML structure as the /about RSC page but
// with zero React/RSC overhead — just string concatenation.

import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

const html = `<!DOCTYPE html>
<html lang="en">
<head><title>About - Hono baseline</title></head>
<body>
  <main style="display:flex;flex-direction:column;align-items:center;padding:2rem">
    <h1>How is this not illegal?</h1>
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:2rem;max-width:32rem">
      <h2>About</h2>
      <p style="text-align:center;color:#666">
        This is a demo app built with Spiceflow, showcasing React Server Components
        with direct database queries from the component tree.
      </p>
      <a href="/" style="padding:0.5rem 1rem;border:1px solid #ccc;border-radius:0.375rem">
        Back to home
      </a>
    </div>
  </main>
</body>
</html>`

app.get('/about', (c) => c.html(html))
app.get('/health', (c) => c.json({ status: 'ok' }))

const port = Number(process.env.HONO_PORT || 3322)
console.log(`Hono baseline listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
