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

  test('host SSR includes remote flight payload', async () => {
    const response = await fetch(`${baseURL}/`)
    expect(response.ok).toBe(true)
    const html = await response.text()

    expect(html).toContain('Federation Host App')
    expect(html).toContain('data-remote-id')
    // The remote content is embedded as a Flight payload prop on RemoteIsland,
    // not directly SSR-rendered. Verify the payload data is in the HTML.
    expect(html).toContain('remote-chart')
    expect(html).toContain('user-components')
  })

  test('host page renders remote server component data', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('host-title')).toHaveText(
      'Federation Host App',
    )
    await expect(page.getByText('Chart: revenue')).toBeVisible()
    await expect(page.getByText('Point 1: 10')).toBeVisible()
    await expect(page.getByText('Point 5: 20')).toBeVisible()
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

  test('no console errors during hydration', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    // Wait for remote component to hydrate
    await expect(page.getByTestId('remote-counter')).toBeVisible({
      timeout: 10000,
    })

    expect(errors).toEqual([])
  })
})
