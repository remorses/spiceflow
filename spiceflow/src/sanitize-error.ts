// Redacts strings that look like secrets (API keys, tokens, JWTs, connection
// string credentials, etc.) from error messages and stacks before they reach
// the client. Used by every path that sends error text over the wire: JSON
// error bodies, SSE error events, node/Bun fallbacks, RSC/SSR digests.

const REDACTED = '[REDACTED]'

// All patterns must stay linear: error text can contain user input (URLs,
// headers), so unbounded prefixes like `\b[\w-]*token` are ReDoS vectors.

const PEM_BEGIN_RE = /-----BEGIN [A-Z ]{0,20}PRIVATE KEY-----/g
const PEM_END_RE = /-----END [A-Z ]{0,20}PRIVATE KEY-----/g

// JWT tokens: eyJ followed by base64url chars, with 2 or 3 dot-separated segments
const JWT_RE =
  /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?/g

// Connection string credentials: scheme://user:password@host (user may be empty)
const CONN_STRING_RE = /:\/\/([^:/?#@\s]*):([^@\s/]+)@/g

const SECRET_KEY =
  '[\\w-]{0,32}(?:token|secret|password|passwd|pwd|api[_-]?key|signature|sig|session|credentials?)'

// JSON fields: "password": "...", "apiKey": "..."
const JSON_FIELD_RE = new RegExp(
  `("${SECRET_KEY}"\\s*:\\s*")(?:[^"\\\\]|\\\\.)*"`,
  'gi',
)

// Query/form params and cookie pairs: access_token=..., X-Amz-Signature=...
const PARAM_RE = new RegExp(`\\b(${SECRET_KEY}=)[^\\s&"',;<>]+`, 'gi')

// Authorization header: always redact its value, whatever it looks like
const AUTH_HEADER_RE =
  /\b((?:proxy-)?authorization\s*:\s*)(?:(Bearer|Basic|Token|Digest)\s+)?[^\s,;"']+/gi

// Bare schemes in prose: Bearer xxx, Basic xxx
const AUTH_SCHEME_RE = /\b(Bearer|Basic)(\s+)([A-Za-z0-9._~+/-]{8,}=*)/gi

// Credential headers: x-api-key: ..., Cookie: ..., client-secret: ...
const CREDENTIAL_HEADER_RE =
  /\b([\w-]{0,32}(?:api[_-]?key|secret|cookie)\s*:\s*)[^\s,;"']+/gi

// token: ... is also common prose ("invalid token: expired")
const TOKEN_HEADER_RE = /\b([\w-]{0,32}token\s*:\s*)([^\s,;"']+)/gi

// Object keys whose values are always secret, whatever the value looks like
const SENSITIVE_KEY_RE =
  /token|secret|password|passwd|pwd|api[_-]?key|signature|session|credential|authorization|cookie/i

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

// Linear scan: a lazy BEGIN...END regex goes quadratic on repeated BEGIN markers.
function redactPem(text: string): string {
  let result = ''
  let cursor = 0
  PEM_BEGIN_RE.lastIndex = 0
  let begin: RegExpExecArray | null
  while ((begin = PEM_BEGIN_RE.exec(text))) {
    PEM_END_RE.lastIndex = begin.index
    const end = PEM_END_RE.exec(text)
    // No END after this BEGIN means none after later ones either
    if (!end) break
    result += text.slice(cursor, begin.index) + REDACTED
    cursor = end.index + end[0].length
    PEM_BEGIN_RE.lastIndex = cursor
  }
  return result + text.slice(cursor)
}

export function sanitizeErrorMessage(message: string): string {
  try {
    let result = message

    result = redactPem(result)
    result = result.replace(JWT_RE, REDACTED)
    result = result.replace(CONN_STRING_RE, `://$1:${REDACTED}@`)
    result = result.replace(JSON_FIELD_RE, `$1${REDACTED}"`)
    result = result.replace(PARAM_RE, `$1${REDACTED}`)
    result = result.replace(AUTH_HEADER_RE, (_match, name, scheme) =>
      scheme ? `${name}${scheme} ${REDACTED}` : `${name}${REDACTED}`,
    )
    result = result.replace(AUTH_SCHEME_RE, (match, scheme, space, value) =>
      looksLikeCredential(value) ? `${scheme}${space}${REDACTED}` : match,
    )
    result = result.replace(CREDENTIAL_HEADER_RE, `$1${REDACTED}`)
    result = result.replace(TOKEN_HEADER_RE, (match, name, value) =>
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
  const replacer = (key: string, value: unknown) => {
    const isPrimitive =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    if (isPrimitive && key !== 'message' && key !== 'stack' && SENSITIVE_KEY_RE.test(key)) {
      return REDACTED
    }
    return typeof value === 'string' ? sanitizeErrorMessage(value) : value
  }
  try {
    return JSON.stringify(body, replacer)
  } catch {
    // Circular or non-serializable fields (e.g. HTTP client errors): drop them.
    return JSON.stringify({ message: body.message, stack: body.stack }, replacer)
  }
}
