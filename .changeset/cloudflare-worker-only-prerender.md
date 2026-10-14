---
'spiceflow': patch
---

Cloudflare `staticPage()` and `staticGet()` routes now always run `.use()` middleware. Prerendered files are no longer written at public asset paths like `about.html`, where Cloudflare served them before the Worker. They go to `/cdn-cgi/_spiceflow/prerender/<deployment-id>/`, which visitors cannot fetch, and the Worker serves them through the `ASSETS` binding after the middleware, without rendering again. Add the binding to `wrangler.jsonc`:

```jsonc
{ "assets": { "binding": "ASSETS" } }
```

`serveAssets` from `spiceflow/cloudflare` and `assets.run_worker_first` are no longer needed, so `serveAssets` is removed. Responses served from prerendered files carry `x-spiceflow-prerendered: 1`.
