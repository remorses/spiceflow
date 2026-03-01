---
'spiceflow': patch
---

Harden client-side RSC navigation by adding strict link interception guards, trailing-slash-safe `.rsc` URL rewriting, abortable navigation fetches, non-flight fallback to full document navigation, and default scroll/focus restoration after successful client transitions. This update keeps the existing architecture but improves behavior parity with modern routers for links like hash targets and `target="_blank"`, for example: `toRscUrl({ url: new URL('https://example.com/posts/123/?tab=one#comments') })` now consistently yields `https://example.com/posts/123.rsc?tab=one&__rsc=`.
