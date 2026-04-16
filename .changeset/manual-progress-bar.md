---
'spiceflow': patch
---

add `ProgressBar.start()` and `ProgressBar.end()` so client code can drive the top loading bar around manual fetches, submit flows, and other non-router async work. manual calls now share the same progress state as router navigations, so overlapping work keeps the bar visible until everything has finished.
