---
title: RSC Alignment Plan
description: Fixes needed to align spiceflow's RSC implementation with @vitejs/plugin-rsc best practices
---

# RSC Alignment Plan

Comparison of spiceflow's RSC implementation against the `@vitejs/plugin-rsc` framework author guide (`.agents/skills/vite-plugin-rsc/SKILL.md`). Identifies gaps and concrete fixes.

## 1. CSRF protection on server actions — HIGH

**Problem**: Server actions accept POST requests from the browser. A malicious site can forge cross-origin form submissions targeting action endpoints. The skill explicitly warns about this and shows a `throwIfCSRFAttack` pattern that validates the `Origin` header.

Our code has zero CSRF protection — any cross-origin POST to an action endpoint will execute the server function.

**Fix**: Add Origin header validation in `renderReact` before executing any server action.

**File**: `spiceflow/src/spiceflow.tsx` — inside `renderReact`, before the `if (request.method === 'POST')` block

**Implementation**:
```ts
// Before executing any action, validate Origin header
if (request.method === 'POST') {
  const origin = request.headers.get('Origin')
  if (origin) {
    const requestUrl = new URL(request.url)
    if (origin !== requestUrl.origin) {
      return new Response('Forbidden: origin mismatch', { status: 403 })
    }
  }
  // ... existing action handling
}
```

**Consideration**: Should also support an `allowedActionOrigins` option for whitelisting trusted origins (e.g., preview deployments, CDN domains). This can be added later as a Spiceflow constructor option.

## 2. Missing `import.meta.hot.accept()` in RSC entry — MEDIUM

**Problem**: The skill says the RSC entry should self-accept HMR to enable efficient hot updates without full page reload. Our `entry.rsc.tsx` has no HMR handling.

Without this, every server code change triggers a full page reload instead of an efficient RSC stream re-render.

**Fix**: Add HMR self-accept to `entry.rsc.tsx`.

**File**: `spiceflow/src/react/entry.rsc.tsx`

**Implementation**:
```ts
// At the end of the file
if (import.meta.hot) {
  import.meta.hot.accept()
}
```

## 3. Missing `createTemporaryReferenceSet` for server actions — MEDIUM

**Problem**: The skill documents that both RSC entry and browser entry should use `createTemporaryReferenceSet()` to track non-serializable args during action calls. Without it, server actions that receive or return non-serializable values (DOM nodes, React elements passed as args) will throw serialization errors.

Currently:
- `entry.client.tsx:34` calls `encodeReply(args)` without `{ temporaryReferences }`
- `spiceflow.tsx:1056` calls `decodeReply(body)` without `{ temporaryReferences }`

**Fix**: Create a `temporaryReferences` set on both sides and pass it through.

**File 1**: `spiceflow/src/react/entry.client.tsx`

```ts
import { createTemporaryReferenceSet } from '@vitejs/plugin-rsc/browser'

// Inside callServer:
const temporaryReferences = createTemporaryReferenceSet()
const payloadPromise = createFromFetch<ServerPayload>(
  fetch(url, {
    method: 'POST',
    body: await encodeReply(args, { temporaryReferences }),
  }),
  { temporaryReferences },
)
```

**File 2**: `spiceflow/src/spiceflow.tsx` — inside `renderReact`

```ts
import { createTemporaryReferenceSet } from '@vitejs/plugin-rsc/rsc'

// Before decodeReply:
const temporaryReferences = createTemporaryReferenceSet()
const args = await decodeReply(body, { temporaryReferences })

// Pass to renderToReadableStream too:
const stream = renderToReadableStream(payload, {
  temporaryReferences,
  // ...existing options
})
```

## 4. SSR error fallback doesn't disable hydration — LOW

**Problem**: When SSR fails, `entry.ssr.tsx` renders an error shell with `<html data-no-hydrate>`. But the browser entry (`entry.client.tsx`) never checks for this attribute — it always calls `hydrateRoot`. This causes hydration mismatch errors in the console when SSR fails.

The skill uses a different approach: inject `self.__NO_HYDRATE=1` into the bootstrap script content, then check for it in the browser entry.

**Fix**: Set a global flag in the error fallback bootstrap script and check it in the browser entry.

**File 1**: `spiceflow/src/react/entry.ssr.tsx` — in the SSR error catch block

```ts
htmlStream = await ReactDOMServer.renderToReadableStream(errorRoot, {
  bootstrapScriptContent: `self.__NO_HYDRATE=1;${bootstrapScriptContent}`,
  signal: request.signal,
})
```

**File 2**: `spiceflow/src/react/entry.client.tsx` — replace `hydrateRoot` call

```ts
if ('__NO_HYDRATE' in globalThis) {
  ReactDomClient.createRoot(document).render(<BrowserRoot />)
} else {
  ReactDomClient.hydrateRoot(document, <BrowserRoot />, {
    formState: (await initialPayload).formState,
  })
}
```

## 5. `createFromReadableStream` initialized outside render context — MEDIUM

**Problem**: In `entry.ssr.tsx:67`, `createFromReadableStream` is called outside the `ReactDOMServer.renderToReadableStream` context. The skill explicitly recommends kicking this off inside a component rendered by ReactDOMServer, so React's preinit/preloading behavior works correctly.

Currently:
```ts
const payloadPromise = createFromReadableStream<ServerPayload>(flightStream1)
// ... later passed to JSX
```

The skill's pattern wraps it inside a component:
```ts
function SsrRoot() {
  payload ??= createFromReadableStream<RscPayload>(forSSR)
  return React.use(payload).root
}
```

**Fix**: Move the `createFromReadableStream` call inside a component that renders within `renderToReadableStream`, using lazy initialization (`??=` pattern).

**File**: `spiceflow/src/react/entry.ssr.tsx`

**Implementation**: Restructure `renderHtml` so the flight stream deserialization happens inside a component rendered by ReactDOMServer, not eagerly before render.

## 6. Missing `defineEncryptionKey` for server action closures — HIGH

**Problem**: `vite.tsx:45` does not configure `defineEncryptionKey` in the `rsc()` plugin options. Server action closure arguments are encrypted at build time, and without a stable key, the encryption key changes on every build/restart. This causes:
- Action calls to fail after a deploy if the client has a stale bundle
- Instability in multi-instance deployments where instances have different keys

**Fix**: Add `defineEncryptionKey` to the `rsc()` config, reading from an environment variable.

**File**: `spiceflow/src/vite.tsx`

**Implementation**:
```ts
rsc({
  entries: { ... },
  serverHandler: false,
  rscCssTransform: false,
  defineEncryptionKey: 'process.env.RSC_ENCRYPTION_KEY',
})
```

**Consideration**: Need to document that users should set `RSC_ENCRYPTION_KEY` as a stable secret in production. For dev, the plugin likely falls back to a default.

## 7. Missing `validateImports: true` build-time safety — LOW

**Problem**: The skill recommends enabling `validateImports: true` to catch invalid cross-environment imports at build time (e.g., importing a server-only module from a client component). Without it, these issues only surface at runtime.

**Fix**: Add `validateImports: true` to the `rsc()` config.

**File**: `spiceflow/src/vite.tsx`

## Oracle review notes

- **CSRF fix**: Must return the 403 response **before** entering the existing `try/catch` action block, otherwise it gets swallowed into `actionError` and returns a 200 RSC payload.
- **CSRF fix**: Strict `origin === requestUrl.origin` may reject valid proxied setups. The `allowedActionOrigins` option should be part of the same change or the very next patch.
- **Temporary refs**: Use one `temporaryReferences` set per action request. The same instance must be passed through `decodeReply` and `renderToReadableStream` — don't create separate sets.
- **SSR error**: Current `data-no-hydrate` attribute is inert. The `self.__NO_HYDRATE=1` + client `createRoot` branch approach is correct.
- **Priority adjustment**: RSC HMR self-accept (#2) can be lowered to LOW (dev-only ergonomics). `defineEncryptionKey` (#6) should be HIGH for production.

## Non-issues (intentional differences)

- **Navigation convention**: We use `.rsc` suffix + `__rsc` query param vs the skill's `_.rsc` suffix. This is a framework-level choice, not a bug.
- **HMR re-fetch strategy**: We use `router.replace(router.location)` instead of a direct RSC fetch. This works but triggers a full navigation cycle — acceptable for now.
- **`rscCssTransform: false`**: We handle CSS ourselves via `virtual:app-styles`. This is correct per the skill's guidance for frameworks that manage CSS manually.
- **`serverHandler: false`**: We provide our own server via the SSR middleware plugin. Correct.
