---
'spiceflow': patch
---

add a stable `stop()` method to the object returned by `app.listen()` across runtimes, including noop cases like Vite dev and prerender, so cleanup code can shut down listeners without server-specific type assertions.
