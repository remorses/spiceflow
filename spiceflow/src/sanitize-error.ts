// Redacts strings that look like secrets (API keys, tokens, JWTs, connection
// string credentials, etc.) from error messages and stacks before they reach
// the client. Used by every path that sends error text over the wire: JSON
// error bodies, SSE error events, node/Bun fallbacks, RSC/SSR digests.

const REDACTED = '[REDACTED]'

const PEM_RE =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g

// JWT tokens: eyJ followed by base64url chars, with 2 or 3 dot-separated segments
const JWT_RE =
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?/g

// Connection string credentials: scheme://user:password@host (user may be empty)
const CONN_STRING_RE = /:\/\/([^:/?#@\s]*):([^@\s/]+)@/g

const SECRET_KEY =
  '[\\w-]*(?:token|secret|password|passwd|pwd|api[_-]?key|signature|sig|session|credentials?)'

// JSON fields: "password": "...", "apiKey": "..."
const JSON_FIELD_RE = new RegExp(
  `("${SECRET_KEY}"\\s*:\\s*")(?:[^"\\\\]|\\\\.)*"`,
  'gi',
)

// Query/form params and cookie pairs: access_token=..., X-Amz-Signature=...
const PARAM_RE = new RegExp(`\\b(${SECRET_KEY}=)[^\\s&"',;<>]+`, 'gi')

// Authorization schemes: Bearer xxx, Basic xxx
const AUTH_SCHEME_RE = /\b(Bearer|Basic)(\s+)([A-Za-z0-9._~+/-]{8,}=*)/gi

// Header lines: x-api-key: ..., Cookie: ..., token: ...
const HEADER_RE =
  /\b((?:x-)?[\w-]*(?:api[_-]?key|token|secret|cookie)\s*:\s*)([^\s,;"']+)/gi

// Common API key prefixes followed by high-entropy strings
const API_KEY_PREFIX_RE =
  /\b(sk[-_]|pk[-_]|api[-_]?key[-_]?|AKIA|AIza|ghp_|gho_|ghs_|ghr_|ghu_|github_pat_|glpat-|npm_|xox[bpsar]-|whsec_|shpat_|shpss_|dop_v1_|sk_live_|pk_live_|sk_test_|pk_test_|rk_live_|rk_test_)[A-Za-z0-9_-]{8,}/g

// Hex secrets (hashes, HMAC keys, API secrets): 32+ hex chars
const HEX_RE = /\b[0-9a-fA-F]{32,}\b/g

// Generic high-entropy: 20+ character strings of key chars without spaces.
const HIGH_ENTROPY_RE =
  /(?<![A-Za-z0-9_/-])[A-Za-z0-9_/-]{20,}(?![A-Za-z0-9_/-])/g

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function charClassCount(s: string): number {
  let mask = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 97 && c <= 122)
      mask |= 1 // a-z
    else if (c >= 65 && c <= 90)
      mask |= 2 // A-Z
    else if (c >= 48 && c <= 57)
      mask |= 4 // 0-9
    else mask |= 8 // symbols
  }
  let count = 0
  while (mask) {
    count += mask & 1
    mask >>= 1
  }
  return count
}

function isLikelySecret(s: string): boolean {
  if (s.length < 20) return false
  if (UUID_RE.test(s)) return false
  // Must use at least 3 character classes (e.g. upper + lower + digit)
  if (charClassCount(s) < 3) return false
  // Must not be a common English-like word or path: reject if mostly lowercase
  const lower = s.replace(/[^a-z]/g, '').length
  if (lower / s.length > 0.85) return false
  // Reject common code identifiers: camelCase or snake_case with <= 30 chars
  // and no digit runs of 4+
  if (s.length <= 30 && !/\d{4,}/.test(s)) return false
  return true
}

// Values after "Bearer"/"Basic" or a header name must look like credentials,
// so prose like "Basic authentication" or "token: expired" stays readable.
function looksLikeCredential(value: string): boolean {
  if (value.length < 8) return false
  return /\d/.test(value) || /[+/=]/.test(value) || (/[a-z]/.test(value) && /[A-Z]/.test(value))
}

export function sanitizeErrorMessage(message: string): string {
  try {
    let result = message

    result = result.replace(PEM_RE, REDACTED)
    result = result.replace(JWT_RE, REDACTED)
    result = result.replace(CONN_STRING_RE, `://$1:${REDACTED}@`)
    result = result.replace(JSON_FIELD_RE, `$1${REDACTED}"`)
    result = result.replace(PARAM_RE, `$1${REDACTED}`)
    result = result.replace(AUTH_SCHEME_RE, (match, scheme, space, value) =>
      looksLikeCredential(value) ? `${scheme}${space}${REDACTED}` : match,
    )
    result = result.replace(HEADER_RE, (match, name, value) =>
      value !== REDACTED && looksLikeCredential(value) ? `${name}${REDACTED}` : match,
    )
    result = result.replace(API_KEY_PREFIX_RE, REDACTED)
    result = result.replace(HEX_RE, REDACTED)

    result = result.replace(HIGH_ENTROPY_RE, (match) => {
      // Absolute paths (stack frames): judge each segment on its own so
      // directory names stay readable while embedded secrets still redact.
      if (match.startsWith('/')) {
        return match
          .split('/')
          .map((segment) => (isLikelySecret(segment) ? REDACTED : segment))
          .join('/')
      }
      if (isLikelySecret(match)) return REDACTED
      return match
    })

    return result
  } catch {
    return message
  }
}

/**
 * JSON body for an unhandled error: own enumerable fields (status, code, ...),
 * message, and stack unless noStackTraces is set. Every string is sanitized.
 */
export function serializeErrorBody({
  error,
  noStackTraces = false,
}: {
  error: unknown
  noStackTraces?: boolean
}): string {
  const fields: Record<string, unknown> =
    error && typeof error === 'object' ? { ...error } : {}
  const rawMessage = error && typeof error === 'object' ? Reflect.get(error, 'message') : error
  const body: Record<string, unknown> = {
    ...fields,
    message: (typeof rawMessage === 'string' && rawMessage) || 'Internal Server Error',
  }
  delete body.stack
  if (!noStackTraces && error instanceof Error && error.stack) {
    body.stack = error.stack
  }
  const replacer = (_key: string, value: unknown) =>
    typeof value === 'string' ? sanitizeErrorMessage(value) : value
  try {
    return JSON.stringify(body, replacer)
  } catch {
    // Circular or non-serializable fields (e.g. HTTP client errors): drop them.
    return JSON.stringify({ message: body.message, stack: body.stack }, replacer)
  }
}
