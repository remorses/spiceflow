---
'spiceflow': patch
---

Redirect browser document requests away from internal `.rsc` / `__rsc` URLs. If a user lands on a flight transport URL directly (e.g. pasted link, bad redirect), they now get a 302 redirect to the clean document URL instead of seeing raw RSC payload. Programmatic RSC fetches from client-side navigation and server actions are unaffected.
