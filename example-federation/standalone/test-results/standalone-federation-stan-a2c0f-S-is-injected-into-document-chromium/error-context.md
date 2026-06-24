# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: standalone-federation.test.ts >> standalone federation consumer >> remote CSS is injected into document
- Location: e2e/standalone-federation.test.ts:54:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - heading "Standalone Federation Consumer" [level=1] [ref=e4]
  - generic [ref=e5]:
    - button "Load Remote Chart" [ref=e6]
    - generic [ref=e8]:
      - 'heading "Chart: default" [level=2] [ref=e9]'
      - list [ref=e10]:
        - listitem [ref=e11]: "Point 1: 10"
        - listitem [ref=e12]: "Point 2: 25"
        - listitem [ref=e13]: "Point 3: 15"
        - listitem [ref=e14]: "Point 4: 30"
        - listitem [ref=e15]: "Point 5: 20"
      - generic [ref=e16]:
        - generic [ref=e17]: "url: /"
        - generic [ref=e18]: "default chart counter: 0"
        - button "+" [ref=e19] [cursor=pointer]
        - button "-" [ref=e20] [cursor=pointer]
  - separator [ref=e21]
  - button "Load Chart in Shadow DOM" [ref=e23]
  - separator [ref=e24]
  - generic [ref=e26]:
    - textbox "Type a message..." [ref=e27]
    - button "Send" [ref=e28] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | 
  3   | const standalonePort = 3053
  4   | const remotePort = 3051
  5   | const baseURL = `http://localhost:${standalonePort}`
  6   | const remoteURL = `http://localhost:${remotePort}`
  7   | 
  8   | // Federation decode loads remote chunks via dynamic import which takes a few
  9   | // seconds on first load (cold cache). Use generous timeouts.
  10  | const DECODE_TIMEOUT = 30_000
  11  | 
  12  | test.describe('standalone federation consumer', () => {
  13  |   test('loads and renders remote chart with interactive client component', async ({ page }) => {
  14  |     await page.goto('/')
  15  | 
  16  |     await page.getByTestId('load-chart').click()
  17  | 
  18  |     const chart = page.getByTestId('remote-chart')
  19  |     await expect(chart).toBeVisible({ timeout: DECODE_TIMEOUT })
  20  | 
  21  |     await expect(chart).toContainText('Chart: default')
  22  |     await expect(chart).toContainText('Point 1: 10')
  23  | 
  24  |     // Verify client component rendered and is interactive
  25  |     const counter = page.getByTestId('remote-counter')
  26  |     await expect(counter).toBeVisible()
  27  |     await expect(counter).toContainText('counter: 0')
  28  | 
  29  |     await counter.getByRole('button', { name: '+' }).click()
  30  |     await expect(counter).toContainText('counter: 1')
  31  | 
  32  |     await counter.getByRole('button', { name: '+' }).click()
  33  |     await expect(counter).toContainText('counter: 2')
  34  |   })
  35  | 
  36  |   test('streams chat messages via async generator federation', async ({ page }) => {
  37  |     await page.goto('/')
  38  | 
  39  |     await page.getByTestId('chat-input').fill('test message')
  40  |     await page.getByTestId('chat-submit').click()
  41  | 
  42  |     await expect(page.getByTestId('message-user')).toContainText('test message')
  43  | 
  44  |     // Wait for all 3 streamed parts to appear
  45  |     await expect(page.getByTestId('chat-part-0')).toBeVisible({ timeout: DECODE_TIMEOUT })
  46  |     await expect(page.getByTestId('chat-part-1')).toBeVisible({ timeout: DECODE_TIMEOUT })
  47  |     await expect(page.getByTestId('chat-part-2')).toBeVisible({ timeout: DECODE_TIMEOUT })
  48  | 
  49  |     await expect(page.getByTestId('chat-part-0')).toContainText('I received your message: "test message"')
  50  |     await expect(page.getByTestId('chat-part-1')).toContainText('Let me think about that')
  51  |     await expect(page.getByTestId('chat-part-2')).toContainText('detailed answer')
  52  |   })
  53  | 
  54  |   test('remote CSS is injected into document', async ({ page }) => {
  55  |     await page.goto('/')
  56  | 
  57  |     await page.getByTestId('load-chart').click()
  58  | 
  59  |     const counter = page.getByTestId('remote-counter')
  60  |     await expect(counter).toBeVisible({ timeout: DECODE_TIMEOUT })
  61  | 
  62  |     // Verify a <link rel="stylesheet"> pointing to the remote origin exists in <head>
  63  |     const remoteCssLinks = await page.evaluate(() => {
  64  |       const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  65  |       return links
  66  |         .map((l) => l.getAttribute('href') || '')
  67  |         .filter((href) => href.includes('localhost:3051'))
  68  |     })
> 69  |     expect(remoteCssLinks.length).toBeGreaterThan(0)
      |                                   ^ Error: expect(received).toBeGreaterThan(expected)
  70  | 
  71  |     // Wait for remote CSS to load and apply (#3b82f6 = rgb(59, 130, 246))
  72  |     await expect
  73  |       .poll(
  74  |         () => counter.evaluate((el) => getComputedStyle(el).borderColor),
  75  |         { timeout: 5000 },
  76  |       )
  77  |       .toBe('rgb(59, 130, 246)')
  78  | 
  79  |     // Verify border-radius from counter.css (8px)
  80  |     const borderRadius = await counter.evaluate(
  81  |       (el) => getComputedStyle(el).borderRadius,
  82  |     )
  83  |     expect(borderRadius).toBe('8px')
  84  | 
  85  |     // Verify button background from counter.css (#3b82f6)
  86  |     const btnBg = await counter
  87  |       .getByRole('button', { name: '+' })
  88  |       .evaluate((el) => getComputedStyle(el).backgroundColor)
  89  |     expect(btnBg).toBe('rgb(59, 130, 246)')
  90  |   })
  91  | 
  92  |   test('shadow DOM: CSS is inside shadow root, not in document.head', async ({ page }) => {
  93  |     await page.goto('/')
  94  | 
  95  |     await page.getByTestId('load-shadow-chart').click()
  96  | 
  97  |     // Wait for the shadow DOM mount to contain the remote chart
  98  |     await expect
  99  |       .poll(
  100 |         () =>
  101 |           page.evaluate(() => {
  102 |             const host = document.querySelector('[data-testid="shadow-chart-host"]')
  103 |             if (!host) return 'no host'
  104 |             if (!host.shadowRoot) return 'no shadow'
  105 |             const mount = host.shadowRoot.querySelector('[data-mount]')
  106 |             if (!mount) return 'no mount'
  107 |             const chart = mount.querySelector('[data-testid="remote-chart"]')
  108 |             return chart ? 'ready' : 'no chart'
  109 |           }),
  110 |         { timeout: DECODE_TIMEOUT },
  111 |       )
  112 |       .toBe('ready')
  113 | 
  114 |     // Verify CSS links are inside the shadow root
  115 |     const shadowCssLinks = await page.evaluate(() => {
  116 |       const host = document.querySelector('[data-testid="shadow-chart-host"]')
  117 |       const shadow = host?.shadowRoot
  118 |       if (!shadow) return []
  119 |       return Array.from(shadow.querySelectorAll('link[rel="stylesheet"]')).map(
  120 |         (l) => l.getAttribute('href') || '',
  121 |       )
  122 |     })
  123 |     expect(shadowCssLinks.length).toBeGreaterThan(0)
  124 |     expect(shadowCssLinks.some((href) => href.includes('localhost:3051'))).toBe(true)
  125 | 
  126 |     // Verify CSS links are NOT in document.head for the shadow chart
  127 |     // (the normal chart test above may have injected its own links, so
  128 |     // we only check that shadow CSS injection didn't also add to head)
  129 |     const headCssAfterShadow = await page.evaluate(() => {
  130 |       const links = Array.from(document.querySelectorAll('head link[rel="stylesheet"]'))
  131 |       return links
  132 |         .map((l) => l.getAttribute('href') || '')
  133 |         .filter((href) => href.includes('localhost:3051'))
  134 |     })
  135 |     // Since we haven't clicked "Load Remote Chart" (only shadow), head should have 0 remote links
  136 |     expect(headCssAfterShadow.length).toBe(0)
  137 | 
  138 |     // Verify computed styles are applied inside the shadow DOM
  139 |     const borderColor = await page.evaluate(() => {
  140 |       const host = document.querySelector('[data-testid="shadow-chart-host"]')
  141 |       const counter = host?.shadowRoot
  142 |         ?.querySelector('[data-mount]')
  143 |         ?.querySelector('[data-testid="remote-counter"]')
  144 |       if (!counter) return ''
  145 |       return getComputedStyle(counter).borderColor
  146 |     })
  147 |     expect(borderColor).toBe('rgb(59, 130, 246)')
  148 | 
  149 |     const borderRadius = await page.evaluate(() => {
  150 |       const host = document.querySelector('[data-testid="shadow-chart-host"]')
  151 |       const counter = host?.shadowRoot
  152 |         ?.querySelector('[data-mount]')
  153 |         ?.querySelector('[data-testid="remote-counter"]')
  154 |       if (!counter) return ''
  155 |       return getComputedStyle(counter).borderRadius
  156 |     })
  157 |     expect(borderRadius).toBe('8px')
  158 |   })
  159 | 
  160 |   test('shadow DOM: host page styles do not affect shadow content', async ({ page }) => {
  161 |     await page.goto('/')
  162 | 
  163 |     // Inject a hostile global style that would break counter styling
  164 |     await page.evaluate(() => {
  165 |       const style = document.createElement('style')
  166 |       style.textContent = `
  167 |         [data-testid="remote-counter"] {
  168 |           border-color: red !important;
  169 |           border-radius: 0 !important;
```