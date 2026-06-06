---
'spiceflow': minor
---

Auto-inject federation CSS in standalone consumers. `decodeFederationPayloadDetails()` now automatically injects remote stylesheets into `document.head` and waits for them to load before returning, preventing flash of unstyled content. No manual CSS injection code needed.

```ts
// Before: manual CSS injection required
const decoded = await decodeFederationPayloadDetails<ReactNode>(response)
injectFederationCss(decoded.metadata.cssLinks, decoded.metadata.clientModules, decoded.remoteOrigin)
setChartNode(decoded.value)

// After: CSS loads automatically
const decoded = await decodeFederationPayloadDetails<ReactNode>(response)
setChartNode(decoded.value)
```

Pass `{ injectCss: false }` to opt out for custom targets like Shadow DOM:

```ts
const decoded = await decodeFederationPayloadDetails(response, { injectCss: false })
// manually inject into a shadow root or other target
```

`injectFederationCss(metadata, remoteOrigin)` is also exported from `spiceflow/federation-client` for custom injection scenarios.
