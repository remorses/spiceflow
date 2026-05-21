---
'spiceflow': patch
---

Fix federation remote client chunks with newer Vite 8 builds. Remote user component chunks now keep strict entry signatures during the client build, preventing them from importing and executing the remote app entry when they are loaded inside a host application.
