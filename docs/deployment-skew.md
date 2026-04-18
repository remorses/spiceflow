# Deployment Skew

How Spiceflow handles the case where the client is running code from an old deployment while the server has already been updated to a new one.

## Flight Data and Client References

When a server component renders JSX containing `"use client"` components, React serializes the tree into a **flight payload** — a streaming format that references client components by ID instead of embedding their code.

Each client component reference in the flight payload looks like:

```json
{ "id": "abc123", "name": "default", "chunks": [], "async": true }
```

The `id` is a **referenceKey** computed as `hash(relativeFilePath)` during the production build. The `name` is the export name (`default`, `MyComponent`, etc.). No chunk URLs appear in the flight payload — only this stable ID.

## How Client Reference IDs Are Calculated

`@vitejs/plugin-rsc` normalizes client reference IDs differently per environment:

- **Production build**: `referenceKey = hashString(relativeFilePath)` — a deterministic hash of the file's path relative to the project root. Same source tree → same hash, every time.
- **Dev mode**: a normalized URL from Vite's import analysis — changes between restarts, but that's fine since dev doesn't have deployments.

Because the hash is based on the file path (not file content or chunk hashes), the referenceKey is **stable across deployments** as long as you don't rename or move the file.

## Why the Client Loads Old URLs, Not New Ones

This is the key insight: the flight payload only contains the referenceKey (`abc123`), not a chunk URL. The chunk URL resolution happens entirely on the client side.

During the client build, `@vitejs/plugin-rsc` generates a **client references map** that gets compiled into the client bundle:

```ts
// Baked into the client JS bundle at build time
export default {
  "abc123": async () => {
    const m = await import("./user-components-f8a2c1.js")
    return m.export_abc123
  },
}
```

When the old client receives a flight payload from the new server:

```
New server renders JSX → flight payload contains ref "abc123"
    ↓
Old client's React runtime calls __webpack_require__("abc123")
    ↓
Old client looks up "abc123" in its OWN baked-in references map
    ↓
Finds it → import("./user-components-f8a2c1.js")  ← old chunk URL
    ↓
CDN still serves the old chunk → component loads ✅
```

The old client never sees or uses the new server's chunk URLs. It always resolves through its own compiled map, loading its own version of every component — through the same React instance already in memory.

## No Duplicate React Instances

If the flight payload contained chunk URLs directly and the client loaded them, the new chunks would bring in a second copy of React — breaking hooks, context, and everything else. But because the client always loads chunks from its own build (via its baked-in references map), there's only ever one React instance. The new server's chunk layout is irrelevant to the old client.

## CDN Asset Persistence

This works because CDNs keep old hashed assets around:

- **Cloudflare Workers Assets** uses content-hash-based deduplication. On each deploy it compares file hashes with previously deployed assets and only uploads changed files. Old unchanged files remain accessible.
- **Cloudflare Pages** caches assets for up to a week after deployment.
- **Any CDN with immutable caching** for content-hashed files (`user-components-f8a2c1.js`) will continue serving old chunks.

As long as old chunk files aren't actively purged, the old client can load them indefinitely.

## Spiceflow's Approach

Spiceflow does **not** use cookies or 409 responses for deployment skew protection. Both client navigations and server actions execute normally against the new server, as long as referenced client components remain backward-compatible.

This works because:

1. The referenceKey (`hash(filePath)#exportName`) is stable — same file path, same ID across deploys
2. The flight payload contains only referenceKeys, not chunk URLs — the old client resolves from its own map
3. The old client loads its own chunks from CDN, using its own React instance
4. No duplicate modules, no hydration mismatches

Cross-deployment requests can fail in two cases:

- **New client component** — the new server renders JSX containing a `"use client"` component that didn't exist in the old build. The old client's references map won't have that ID.
- **Changed props interface** — a client component keeps the same file path but its props shape changes between deploys. The old client loads old component code that receives incompatible props from the new server. This is the same as any API contract change and is a code compatibility concern rather than a framework issue.

Each production build still stamps a unique **deployment ID** (build timestamp) into the server bundle, available via `getDeploymentId()`. This is useful for analytics, logging, and cache keys — but it's not used to block requests.

## Encryption of Bound Arguments

`@vitejs/plugin-rsc` encrypts **bound arguments** (closure-captured values) in server actions using AES-256-GCM. This protects server-side data that gets serialized into the RSC payload when an inline `"use server"` function captures variables from a server component.

By default the encryption key is randomly generated per build — meaning bound args encrypted by build N cannot be decrypted by build N+1. To make bound args survive across deployments, set the `RSC_ENCRYPTION_KEY` environment variable to a stable base64-encoded 32-byte key.

This only matters for inline server actions that capture variables. Top-level exported actions (in dedicated `"use server"` files) have no closures, so there's nothing to encrypt.

## Summary

```
┌──────────────────────────────────────────────────────────────────────┐
│                What happens across deployments?                      │
├──────────────────────┬───────────────────────────────────────────────┤
│ Client navigation    │ Executes normally on new server               │
│ Server action call   │ Executes normally on new server               │
│ Action returns JSX   │ Old client resolves refs from own map ✅       │
│ Action bound args    │ Needs stable RSC_ENCRYPTION_KEY if used       │
│ New component in JSX │ Fails if component didn't exist in old build  │
│ Client ref IDs       │ Stable (hash of file path)                    │
│ Client chunk URLs    │ Old chunks served by CDN                      │
│ React instance       │ Always one — no duplicates                    │
└──────────────────────┴───────────────────────────────────────────────┘
```
