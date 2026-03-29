import { expect, test } from '@playwright/test'

const hostPort = 3052
const remotePort = 3051
const baseURL = `http://localhost:${hostPort}`
const remoteURL = `http://localhost:${remotePort}`

test.describe('federation', () => {
  test('remote API returns flight payload with client modules', async () => {
    const response = await fetch(
      `${remoteURL}/api/chart?dataSource=revenue`,
    )
    expect(response.ok).toBe(true)
    const data = await response.json()

    expect(data.remoteId).toBeTruthy()
    expect(data.flightPayload).toContain('remote-chart')
    expect(data.flightPayload).toContain('Counter')
    expect(data.clientModules).toBeTruthy()

    // ssrHtml contains pre-rendered HTML for the component
    expect(data.ssrHtml).toContain('data-testid="remote-chart"')
    expect(data.ssrHtml).toContain('revenue')
    expect(data.ssrHtml).toContain('data-testid="remote-counter"')
    expect(data.ssrHtml).toContain('counter:')

    // clientModules should only contain user-component chunks, not index/framework
    for (const [, info] of Object.entries(data.clientModules) as [
      string,
      { chunks: string[] },
    ][]) {
      for (const chunk of info.chunks) {
        expect(chunk).toContain('user-components')
        expect(chunk).not.toContain('index-')
        expect(chunk).not.toContain('spiceflow-framework')
      }
    }
  })

  test('remote component is SSR-rendered in the host HTML', async () => {
    const response = await fetch(`${baseURL}/`)
    expect(response.ok).toBe(true)
    const html = await response.text()

    // Strip <script> tags so we only check visible HTML, not Flight payload
    // data embedded in inline scripts.
    const visible = html.replace(/<script[\s\S]*?<\/script>/gi, '')

    expect(visible).toContain('Federation Host App')
    expect(visible).toContain('data-remote-id')

    // Remote server component data is SSR-rendered as visible HTML
    expect(visible).toContain('data-testid="remote-chart"')
    expect(visible).toContain('revenue')
    expect(visible).toContain('Point')

    // Remote client component (Counter) initial state is SSR-rendered
    expect(visible).toContain('data-testid="remote-counter"')
    expect(visible).toContain('counter:')
  })

  test('remote client component hydrates and is interactive', async ({
    page,
  }) => {
    await page.goto('/')
    const counter = page.getByTestId('remote-counter')
    await expect(counter).toBeVisible({ timeout: 10000 })
    await expect(counter.getByText('counter: 0')).toBeVisible()

    await counter.getByRole('button', { name: '+' }).click()
    await expect(counter.getByText('counter: 1')).toBeVisible()

    await counter.getByRole('button', { name: '+' }).click()
    await expect(counter.getByText('counter: 2')).toBeVisible()

    await counter.getByRole('button', { name: '-' }).click()
    await expect(counter.getByText('counter: 1')).toBeVisible()
  })

  test('host import map is present in HTML', async () => {
    const response = await fetch(`${baseURL}/`)
    const html = await response.text()

    expect(html).toContain('type="importmap"')
    expect(html).toContain('react/jsx-runtime')
    expect(html).toContain('federation-react')
  })

  test('no React errors during hydration', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await expect(page.getByTestId('remote-counter')).toBeVisible({
      timeout: 10000,
    })

    expect(errors).toEqual([])
  })
})
