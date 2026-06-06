---
'spiceflow': minor
---

Auto-inject federation CSS in standalone consumers. `decodeFederationPayload()` and `decodeFederationPayloadDetails()` now automatically inject remote stylesheets into `document.head` and wait for them to load before returning, preventing flash of unstyled content. No manual CSS injection code needed.

```ts
const chartNode = await decodeFederationPayload<ReactNode>(response)
// CSS is already injected and loaded at this point
setChartNode(chartNode)
```

Pass `{ injectCss: false }` to `decodeFederationPayloadDetails` to opt out for custom targets like Shadow DOM:

```ts
const decoded = await decodeFederationPayloadDetails(response, { injectCss: false })
// manually inject into a shadow root or other target
```
