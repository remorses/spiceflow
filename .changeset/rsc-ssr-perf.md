---
'spiceflow': patch
---

Improve React SSR performance by skipping the extra Flight decode on `GET` and `HEAD` document requests, caching bootstrap script content in production, shrinking the default page payload shape, and reducing HTML stream work in `injectRSCPayload()`. These changes improve `nodejs-example` benchmark throughput for normal RSC page renders without regressing redirect handling or client reference preinit behavior.
