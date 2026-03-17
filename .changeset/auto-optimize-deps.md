---
'spiceflow': patch
---

Auto-configure `optimizeDeps.entries` per Vite environment (client, rsc, ssr) pointing at the user's app entry file so Vite crawls the full import graph upfront during dev. This prevents late dependency discovery that triggers re-optimization rounds and page reloads, especially on fresh installs. Same approach used by Waku. Apps no longer need manual `optimizeDeps.include` lists for spiceflow's own transitive dependencies.
