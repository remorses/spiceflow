---
'spiceflow': patch
---

Fix HTTP/2 streaming crash in `sendResponse()`. HTTP/2 forbids `transfer-encoding` and `connection` headers; forwarding them from the Web `Response` to Node's `res.writeHead()` caused `ERR_HTTP2_INVALID_CONNECTION_HEADERS` and crashed the dev server on every streaming response when HTTPS was enabled.

The SSE response constructor no longer sets `transfer-encoding: chunked` (redundant for both protocols since Node applies chunked encoding automatically when piping a stream). `sendResponse()` now detects HTTP/2 via `res.req.httpVersion` and strips the forbidden headers before `writeHead()`.
