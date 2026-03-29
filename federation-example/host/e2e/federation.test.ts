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
      { chunks: string[]; css: string[] },
    ][]) {
      for (const chunk of info.chunks) {
        expect(chunk).toContain('user-components')
        expect(chunk).not.toContain('index-')
        expect(chunk).not.toContain('spiceflow-framework')
      }
    }

    // CSS links are included in the payload
    expect(data.cssLinks).toBeTruthy()
    expect(data.cssLinks.length).toBeGreaterThan(0)
    for (const cssLink of data.cssLinks) {
      expect(cssLink).toContain(remoteURL)
      expect(cssLink).toMatch(/\.css$/)
    }

    // clientModules entries include css arrays
    const modulesWithCss = Object.values(data.clientModules).filter(
      (info: any) => info.css && info.css.length > 0,
    )
    expect(modulesWithCss.length).toBeGreaterThan(0)
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

  test('remote CSS is injected in host HTML via preinit', async () => {
    const response = await fetch(`${baseURL}/`)
    const html = await response.text()

    // ReactDOM.preinit emits <link rel="stylesheet"> tags with the
    // remote's absolute CSS URL in the host HTML.
    const cssLinkRegex = new RegExp(
      `<link[^>]*rel="stylesheet"[^>]*href="${remoteURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*\\.css"`,
    )
    expect(html).toMatch(cssLinkRegex)
  })

  test('remote chunk URLs are absolute (use remote base)', async () => {
    const response = await fetch(
      `${remoteURL}/api/chart?dataSource=revenue`,
    )
    const data = await response.json()

    // JS chunk paths should be absolute with remote origin
    for (const [, info] of Object.entries(data.clientModules) as [
      string,
      { chunks: string[]; css: string[] },
    ][]) {
      for (const chunk of info.chunks) {
        expect(chunk).toMatch(/^https?:\/\//)
        expect(chunk).toContain(remoteURL)
      }
    }
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

  test('remote component reads host router URL', async ({ page }) => {
    await page.goto('/')
    const remoteUrl = page.getByTestId('remote-url')
    await expect(remoteUrl).toBeVisible({ timeout: 10000 })
    await expect(remoteUrl).toHaveText('url: /')
  })

  test('host import map contains spiceflow/react', async () => {
    const response = await fetch(`${baseURL}/`)
    const html = await response.text()

    expect(html).toContain('type="importmap"')
    expect(html).toContain('react/jsx-runtime')
    expect(html).toContain('"spiceflow/react"')
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
