---
'spiceflow': patch
---

Fix server action redirects to external URLs so they create a browser history entry. Redirecting from an action to a third-party checkout or auth provider now lets users press Back and return to the page that started the action instead of replacing that page in history.
