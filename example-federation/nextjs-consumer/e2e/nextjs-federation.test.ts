import { expect, test } from '@playwright/test'

// Federation decode loads remote chunks via dynamic import. Use generous timeouts.
const DECODE_TIMEOUT = 30_000

test.describe('nextjs federation consumer', () => {
  test('page loads and federation initializes', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Next.js Federation Consumer')).toBeVisible()

    // Federation setup is async; wait for button to become enabled
    const loadBtn = page.getByTestId('load-chart')
    await expect(loadBtn).toBeVisible()
    await expect(loadBtn).toHaveText('Load Remote Chart', { timeout: 10_000 })
  })

  test('loads and renders remote chart with interactive counter', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')

    // Wait for federation setup to complete
    const loadBtn = page.getByTestId('load-chart')
    await expect(loadBtn).toHaveText('Load Remote Chart', { timeout: 10_000 })

    await loadBtn.click()

    // Wait for chart to render
    const chart = page.getByTestId('remote-chart')
    await expect(chart).toBeVisible({ timeout: DECODE_TIMEOUT })
    await expect(chart).toContainText('Chart: default')
    await expect(chart).toContainText('Point 1: 10')

    // Verify client component rendered and is interactive
    const counter = page.getByTestId('remote-counter')
    await expect(counter).toBeVisible()
    await expect(counter).toContainText('counter: 0')

    await counter.getByRole('button', { name: '+' }).click()
    await expect(counter).toContainText('counter: 1')

    await counter.getByRole('button', { name: '+' }).click()
    await expect(counter).toContainText('counter: 2')

    // Filter out known benign errors (CORS preflight, etc.)
    const realErrors = errors.filter(
      (e) => !e.includes('Failed to load resource') && !e.includes('net::ERR'),
    )
    expect(realErrors).toEqual([])
  })

  test('no error state after loading chart', async ({ page }) => {
    await page.goto('/')

    const loadBtn = page.getByTestId('load-chart')
    await expect(loadBtn).toHaveText('Load Remote Chart', { timeout: 10_000 })

    await loadBtn.click()

    const chart = page.getByTestId('remote-chart')
    await expect(chart).toBeVisible({ timeout: DECODE_TIMEOUT })

    // Error div should not be present
    await expect(page.getByTestId('error')).not.toBeVisible()
  })
})
