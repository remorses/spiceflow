# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: standalone-federation.test.ts >> standalone federation consumer >> shadow DOM: host page styles do not affect shadow content
- Location: e2e/standalone-federation.test.ts:160:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "rgb(59, 130, 246)"
Received: "rgb(0, 0, 0)"
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - heading "Standalone Federation Consumer" [level=1] [ref=e4]
  - button "Load Remote Chart" [ref=e6]
  - separator [ref=e7]
  - generic [ref=e8]:
    - button "Loaded in Shadow DOM" [ref=e9]
    - generic [ref=e12]:
      - 'heading "Chart: default" [level=2] [ref=e13]'
      - list [ref=e14]:
        - listitem [ref=e15]: "Point 1: 10"
        - listitem [ref=e16]: "Point 2: 25"
        - listitem [ref=e17]: "Point 3: 15"
        - listitem [ref=e18]: "Point 4: 30"
        - listitem [ref=e19]: "Point 5: 20"
      - generic [ref=e20]:
        - generic [ref=e21]: "url: /"
        - generic [ref=e22]: "default chart counter: 0"
        - button "+" [ref=e23]
        - button "-" [ref=e24]
  - separator [ref=e25]
  - generic [ref=e27]:
    - textbox "Type a message..." [ref=e28]
    - button "Send" [ref=e29] [cursor=pointer]
```

# Test source

```ts
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
  170 |         }
  171 |       `
  172 |       document.head.appendChild(style)
  173 |     })
  174 | 
  175 |     await page.getByTestId('load-shadow-chart').click()
  176 | 
  177 |     // Wait for chart to render in shadow DOM
  178 |     await expect
  179 |       .poll(
  180 |         () =>
  181 |           page.evaluate(() => {
  182 |             const host = document.querySelector('[data-testid="shadow-chart-host"]')
  183 |             if (!host?.shadowRoot) return 'no shadow'
  184 |             return host.shadowRoot.querySelector('[data-testid="remote-counter"]')
  185 |               ? 'ready'
  186 |               : 'no counter'
  187 |           }),
  188 |         { timeout: DECODE_TIMEOUT },
  189 |       )
  190 |       .toBe('ready')
  191 | 
  192 |     // The hostile global style should NOT penetrate the shadow boundary
  193 |     const borderColor = await page.evaluate(() => {
  194 |       const host = document.querySelector('[data-testid="shadow-chart-host"]')
  195 |       const counter = host?.shadowRoot
  196 |         ?.querySelector('[data-mount]')
  197 |         ?.querySelector('[data-testid="remote-counter"]')
  198 |       if (!counter) return ''
  199 |       return getComputedStyle(counter).borderColor
  200 |     })
  201 |     // Should still be the original blue, not red
> 202 |     expect(borderColor).toBe('rgb(59, 130, 246)')
      |                         ^ Error: expect(received).toBe(expected) // Object.is equality
  203 |   })
  204 | 
  205 |   test('shadow DOM: client component hydrates and is interactive', async ({ page }) => {
  206 |     await page.goto('/')
  207 | 
  208 |     await page.getByTestId('load-shadow-chart').click()
  209 | 
  210 |     // Wait for counter inside shadow DOM
  211 |     await expect
  212 |       .poll(
  213 |         () =>
  214 |           page.evaluate(() => {
  215 |             const host = document.querySelector('[data-testid="shadow-chart-host"]')
  216 |             const counter = host?.shadowRoot
  217 |               ?.querySelector('[data-mount]')
  218 |               ?.querySelector('[data-testid="remote-counter"]')
  219 |             return counter?.textContent?.includes('counter: 0') ?? false
  220 |           }),
  221 |         { timeout: DECODE_TIMEOUT },
  222 |       )
  223 |       .toBe(true)
  224 | 
  225 |     // Click + button inside shadow DOM
  226 |     await page.evaluate(() => {
  227 |       const host = document.querySelector('[data-testid="shadow-chart-host"]')
  228 |       const btn = host?.shadowRoot
  229 |         ?.querySelector('[data-mount]')
  230 |         ?.querySelector('[data-testid="remote-counter"] button')
  231 |       if (btn instanceof HTMLElement) btn.click()
  232 |     })
  233 | 
  234 |     await expect
  235 |       .poll(() =>
  236 |         page.evaluate(() => {
  237 |           const host = document.querySelector('[data-testid="shadow-chart-host"]')
  238 |           const counter = host?.shadowRoot
  239 |             ?.querySelector('[data-mount]')
  240 |             ?.querySelector('[data-testid="remote-counter"]')
  241 |           return counter?.textContent ?? ''
  242 |         }),
  243 |       )
  244 |       .toContain('counter: 1')
  245 |   })
  246 | 
  247 |   test('no React errors in console', async ({ page }) => {
  248 |     const errors: string[] = []
  249 |     page.on('console', (msg) => {
  250 |       if (msg.type() === 'error') {
  251 |         errors.push(msg.text())
  252 |       }
  253 |     })
  254 | 
  255 |     await page.goto('/')
  256 | 
  257 |     await page.getByTestId('load-chart').click()
  258 |     await expect(page.getByTestId('remote-chart')).toBeVisible({ timeout: DECODE_TIMEOUT })
  259 | 
  260 |     const realErrors = errors.filter(
  261 |       (e) => !e.includes('favicon.ico') && !e.includes('the server responded with a status of'),
  262 |     )
  263 |     expect(realErrors).toEqual([])
  264 |   })
  265 | })
  266 | 
```