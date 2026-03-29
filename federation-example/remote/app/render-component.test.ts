import { describe, test, expect } from 'vitest'

// Tests run against the dev server on port 3051.
// Start it first: PORT=3051 npx vite dev --port 3051

const port = Number(process.env.TEST_PORT || 3051)
const baseURL = `http://localhost:${port}`

describe('federation remote /api/chart', () => {
  test('returns JSON with remoteId and flightPayload', async () => {
    const response = await fetch(`${baseURL}/api/chart`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const data = await response.json()
    expect(data.remoteId).toMatch(/^r_[a-z0-9]+$/)
    expect(typeof data.flightPayload).toBe('string')
    expect(data.flightPayload.length).toBeGreaterThan(0)
  })

  test('flight payload contains server-rendered chart data', async () => {
    const response = await fetch(`${baseURL}/api/chart?dataSource=revenue`)
    const data = await response.json()
    const flight = data.flightPayload

    // Should contain the dataSource prop value
    expect(flight).toContain('revenue')

    // Should contain the chart data points rendered by the server component
    expect(flight).toContain('Point')
  })

  test('flight payload contains client component reference for Counter', async () => {
    const response = await fetch(`${baseURL}/api/chart`)
    const data = await response.json()
    const flight = data.flightPayload

    // Flight stream should contain an I row (import/client reference) for counter.tsx
    // Format: <id>:I["<module-path>",[...],"<export>",1]
    expect(flight).toContain('counter.tsx')
    expect(flight).toContain('Counter')
  })

  test('flight payload lines are valid Flight format', async () => {
    const response = await fetch(`${baseURL}/api/chart?dataSource=test`)
    const data = await response.json()

    const lines = data.flightPayload.split('\n').filter(Boolean)
    expect(lines.length).toBeGreaterThan(0)

    // Each line should match Flight format: <rowId>:<data>
    // Row IDs can be hex digits, or empty (for nonce lines like :N...)
    for (const line of lines) {
      expect(line).toMatch(/^[0-9a-f]*:/)
    }
  })

  test('flight payload structure', async () => {
    const response = await fetch(`${baseURL}/api/chart?dataSource=test`)
    const data = await response.json()

    const lines = data.flightPayload.split('\n').filter(Boolean)

    // Categorize lines by type
    const clientRefs = lines.filter((l: string) => l.match(/^[0-9a-f]+:I\[/))
    const modelRows = lines.filter((l: string) => l.match(/^[0-9a-f]+:\["\$"/))
    const debugRows = lines.filter((l: string) => l.match(/^[0-9a-f]+:D/))

    // Should have at least one client reference (Counter)
    expect(clientRefs.length).toBeGreaterThan(0)
    // Should have model rows (the rendered component tree)
    expect(modelRows.length).toBeGreaterThan(0)

    // Snapshot the client reference line (redact cache hash for stability)
    const clientRef = clientRefs[0]
      .replace(/\$\$cache=[a-z0-9]+/, '$$cache=<hash>')
    expect(clientRef).toMatchInlineSnapshot(`"b:I["/app/counter.tsx$cache=<hash>",[],"Counter",1]"`)
  })

  test('home page renders with SSR', async () => {
    const response = await fetch(`${baseURL}/`)
    const html = await response.text()

    expect(html).toContain('Federation Remote Server')
    expect(html).toContain('data-testid="remote-chart"')
    expect(html).toContain('data-testid="remote-counter"')
    // Counter should be SSR'd with initial count 0
    expect(html).toContain('counter: <!-- -->0')
  })
})
