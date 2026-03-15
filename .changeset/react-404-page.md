---
'spiceflow': patch
---

Render the React `DefaultNotFoundPage` component with proper 404 status when browser requests hit unmatched routes in apps that have React pages registered. Previously, unmatched routes always returned plain text `"Not Found"` regardless of the client. Now browser requests (those with `Accept: text/html`) get the styled 404 page rendered through the full RSC → SSR pipeline, wrapped in layouts, with correct HTTP 404 status. Non-browser requests (API clients, curl, fetch without Accept header) still get plain text `"Not Found"` as before. The SSR layer also preserves the 404 status from the flight response instead of always returning 200.
