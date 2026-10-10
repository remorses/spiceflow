---
'spiceflow': minor
---

`staticPage()` routes are now prerendered on Cloudflare builds too. Before, Cloudflare builds skipped prerendering, so static pages were rendered by the Worker on every request. Now `vite build` starts the built Worker with `vite preview`, fetches each static route, and writes `.html` and `.rsc` files to the client output. Cloudflare serves them as static assets, before the Worker runs:

```tsx
new Spiceflow().staticPage('/about', async () => <About />)
```

```
dist/client/about.html   served for /about, no Worker CPU
dist/client/about.rsc    served for client navigations
dist/client/_headers     /*.rsc: Content-Type text/x-component + deployment id
```

Prerendered pages see the deployed origin in `request.url`, so `og:url` and canonical URLs are correct. On Cloudflare the origin is the single host in the Worker `routes`; pass `spiceflow({ prerenderOrigin: 'https://example.com' })` to set it explicitly (also used by Node builds).

Prerendered HTML now also waits for every Suspense boundary, like responses for bots, so the files contain the final content instead of streamed fallbacks.
