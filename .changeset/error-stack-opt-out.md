---
'spiceflow': minor
---

Add a `noStackTraces` option to hide `stack` from default error responses, and redact secrets on every error path. Stacks stay on by default. `new Spiceflow({ noStackTraces: true })` removes them from JSON error bodies, SSE `event: error` payloads, and the `listen()` / `handleForNode()` fallbacks. Only the app that handles the request reads the option. Error messages, stacks, and extra error fields are now always sanitized before they are sent: JWTs, `Bearer`/`Basic` credentials, secret query params (`token`, `access_token`, `api_key`, `client_secret`, `X-Amz-Signature`, `password`), cookie and `x-api-key` headers, JSON secret fields, connection string passwords, long hex secrets, and more API key prefixes become `[REDACTED]`. Absolute file paths in stack frames and UUIDs are no longer redacted by mistake. Errors with circular fields no longer break the error response.
