import { expect, test } from '@playwright/test'

const standalonePort = 3053
const remotePort = 3051
const baseURL = `http://localhost:${standalonePort}`
const remoteURL = `http://localhost:${remotePort}`

// Federation decode loads remote chunks via dynamic import which takes a few
// seconds on first load (cold cache). Use generous timeouts.
const DECODE_TIMEOUT = 30_000

test.describe('standalone federation consumer', () => {
  test('loads and renders remote chart with interactive client component', async ({ page }) => {
    await page.goto('/')

    await page.getByTestId('load-chart').click()

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
  })

  test('streams chat messages via async generator federation', async ({ page }) => {
    await page.goto('/')

    await page.getByTestId('chat-input').fill('test message')
    await page.getByTestId('chat-submit').click()

    await expect(page.getByTestId('message-user')).toContainText('test message')

    // Wait for all 3 streamed parts to appear
    await expect(page.getByTestId('chat-part-0')).toBeVisible({ timeout: DECODE_TIMEOUT })
    await expect(page.getByTestId('chat-part-1')).toBeVisible({ timeout: DECODE_TIMEOUT })
    await expect(page.getByTestId('chat-part-2')).toBeVisible({ timeout: DECODE_TIMEOUT })

    await expect(page.getByTestId('chat-part-0')).toContainText('I received your message: "test message"')
    await expect(page.getByTestId('chat-part-1')).toContainText('Let me think about that')
    await expect(page.getByTestId('chat-part-2')).toContainText('detailed answer')
  })

  test('remote CSS is injected into document', async ({ page }) => {
    await page.goto('/')

    await page.getByTestId('load-chart').click()

    const counter = page.getByTestId('remote-counter')
    await expect(counter).toBeVisible({ timeout: DECODE_TIMEOUT })

    // Wait for CSS to load (it's fetched from the remote origin)
    await page.waitForTimeout(1000)

    const borderColor = await counter.evaluate(
      (el) => getComputedStyle(el).borderColor,
    )
    // #3b82f6 = rgb(59, 130, 246) from counter.css
    expect(borderColor).toBe('rgb(59, 130, 246)')
  })

  test('no React errors in console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')

    await page.getByTestId('load-chart').click()
    await expect(page.getByTestId('remote-chart')).toBeVisible({ timeout: DECODE_TIMEOUT })

    const realErrors = errors.filter(
      (e) => !e.includes('favicon.ico') && !e.includes('the server responded with a status of'),
    )
    expect(realErrors).toEqual([])
  })
})
