// Redacts secrets from error text before it reaches the client. Used by every
// path that sends error text over the wire: JSON error bodies, SSE error
// events, node/Bun fallbacks, RSC/SSR digests, server action errors.
//
// A value is redacted only when it is a secret by format (JWT, PEM, known API
// key prefix, connection string password, long hex, high-entropy string), or
// when it follows a secret name (token=, password:, Bearer) AND looks like a
// credential. Plain words stay readable: "Bearer realm missing", "token: expired".
//
// Errors with a 4xx status are public: their message is written for the
// client and is never redacted (same convention as http-errors `expose`).

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

// Known API key prefixes followed by key chars
const API_KEY_PREFIX_RE =
  /\b(sk[-_]|pk[-_]|AKIA|AIza|ghp_|gho_|ghs_|ghr_|ghu_|github_pat_|glpat-|npm_|xox[bpsar]-|whsec_|shpat_|shpss_|dop_v1_|rk_live_|rk_test_)[A-Za-z0-9_-]{8,}/g

// Hex secrets (hashes, HMAC keys, API secrets): 32+ hex chars
const HEX_RE = /\b[0-9a-fA-F]{32,}\b/g

// Generic high-entropy: 20+ character strings of key chars without spaces
const HIGH_ENTROPY_RE =
  /(?<![A-Za-z0-9_/-])[A-Za-z0-9_/-]{20,}(?![A-Za-z0-9_/-])/g

// token=..., x-api-key: ..., "password":"..." with a secret name before the value.
// Names are listed explicitly: a generic name pattern would swallow URLs
// (`https:` + rest) and skip the params inside them.
const NAMED_VALUE_RE =
  /(?<![\w-])((?:x-amz-|x-|proxy-|set-|client[-_]?|access[-_]?|refresh[-_]?|id[-_]?|auth[-_]?)?(?:token|api[-_]?key|secret|password|passwd|authorization|cookie|signature))("?\s*[:=]\s*"?)([^\s&"',;<>]+)/gi

// Bearer xxx, Basic xxx (also inside "Authorization: Bearer xxx")
const AUTH_SCHEME_RE = /\b(Bearer|Basic)(\s+)([A-Za-z0-9._~+/-]+=*)/gi

// Names compared after lowercasing and removing - and _
const SECRET_NAMES = new Set([
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authtoken',
  'apikey',
  'xapikey',
  'secret',
  'clientsecret',
  'password',
  'passwd',
  'authorization',
  'proxyauthorization',
  'cookie',
  'setcookie',
  'signature',
  'xamzsignature',
])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isSecretName(name: string): boolean {
  return SECRET_NAMES.has(name.toLowerCase().replace(/[-_]/g, ''))
}

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

// High-entropy check for strings with no context around them
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

// Lower bar for values after a secret name: a word like "expired" or
// "realm" stays readable, anything with digits, mixed case or base64 symbols
// is treated as a credential.
function looksLikeCredential(value: string): boolean {
  if (value.length < 6) return false
  if (/\d/.test(value) || /[+/=]/.test(value)) return true
  // Mixed case beyond a leading capital ("Bearer", "Required" stay readable)
  return value.length >= 8 && /[a-z]/.test(value) && /.[A-Z]/.test(value)
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
    result = result.replace(API_KEY_PREFIX_RE, REDACTED)
    result = result.replace(AUTH_SCHEME_RE, (match, scheme, space, value) =>
      looksLikeCredential(value) ? `${scheme}${space}${REDACTED}` : match,
    )
    result = result.replace(NAMED_VALUE_RE, (match, name, separator, value) =>
      value !== REDACTED && looksLikeCredential(value)
        ? `${name}${separator}${REDACTED}`
        : match,
    )
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

/** 4xx errors carry messages written for the client, like ValidationError. */
export function isPublicError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const status = Reflect.get(error, 'status') ?? Reflect.get(error, 'statusCode')
  return typeof status === 'number' && status >= 400 && status < 500
}

/** Message safe to send to the client: raw for public errors, redacted otherwise. */
export function getClientErrorMessage(error: unknown, message: string): string {
  if (isPublicError(error)) return message
  return sanitizeErrorMessage(message)
}

/**
 * JSON body for an unhandled error: own enumerable fields (status, code, ...),
 * message, and stack unless noStackTraces is set. Fields and stack are always
 * sanitized; the message is kept as is for public (4xx) errors.
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
  const message = (typeof rawMessage === 'string' && rawMessage) || 'Internal Server Error'
  const clientMessage = getClientErrorMessage(error, message)
  const body: Record<string, unknown> = { ...fields, message }
  delete body.stack
  if (!noStackTraces && error instanceof Error && error.stack) {
    body.stack = error.stack
  }
  function replacer(this: unknown, key: string, value: unknown) {
    if (this === body && key === 'message') return clientMessage
    // Structured field named like a secret: redact whatever the value looks like
    if (typeof value === 'string' && key !== 'stack' && isSecretName(key)) {
      return REDACTED
    }
    return typeof value === 'string' ? sanitizeErrorMessage(value) : value
  }
  try {
    return JSON.stringify(body, replacer)
  } catch {
    // Circular or non-serializable fields (e.g. HTTP client errors): drop them.
    const fallback = { message, stack: body.stack }
    return JSON.stringify(fallback, function (this: unknown, key, value) {
      if (this === fallback && key === 'message') return clientMessage
      return typeof value === 'string' ? sanitizeErrorMessage(value) : value
    })
  }
}
