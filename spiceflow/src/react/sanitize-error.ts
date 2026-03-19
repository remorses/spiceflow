// Redacts high-entropy strings that look like secrets (API keys, tokens, JWTs,
// connection string credentials, etc.) from error messages before they reach
// the browser. Called in the RSC and SSR onError callbacks — the two chokepoints
// where error.digest is set for the client.

const REDACTED = '[REDACTED]'

// JWT tokens: eyJ followed by base64url chars, with 2 or 3 dot-separated segments
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?/g

// Bearer / token header values
const BEARER_RE = /\b(Bearer\s+)\S{8,}/gi
const TOKEN_PARAM_RE = /\b(token=)\S{8,}/gi

// Connection string credentials: scheme://user:password@host
const CONN_STRING_RE = /:\/\/([^:/?#]+):([^@]{3,})@/g

// Common API key prefixes followed by high-entropy strings
const API_KEY_PREFIX_RE = /\b(sk[-_]|pk[-_]|api[-_]?key[-_]?|AKIA|ghp_|gho_|ghs_|ghr_|glpat-|xox[bpsar]-|whsec_|sk_live_|pk_live_|sk_test_|pk_test_|rk_live_|rk_test_)[A-Za-z0-9_-]{8,}/g

// Generic high-entropy: 20+ character strings that mix letters, digits, and
// common key chars (-, _, /) without spaces. Entropy is estimated by counting
// distinct character classes: lowercase, uppercase, digit, symbol.
const HIGH_ENTROPY_RE = /(?<![A-Za-z0-9_/-])[A-Za-z0-9_/-]{20,}(?![A-Za-z0-9_/-])/g

function charClassCount(s: string): number {
  let mask = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 97 && c <= 122) mask |= 1       // a-z
    else if (c >= 65 && c <= 90) mask |= 2    // A-Z
    else if (c >= 48 && c <= 57) mask |= 4    // 0-9
    else mask |= 8                             // symbols
  }
  let count = 0
  while (mask) { count += mask & 1; mask >>= 1 }
  return count
}

function isLikelySecret(s: string): boolean {
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

export function sanitizeErrorMessage(message: string): string {
  try {
    let result = message

    result = result.replace(JWT_RE, REDACTED)
    result = result.replace(BEARER_RE, `$1${REDACTED}`)
    result = result.replace(TOKEN_PARAM_RE, `$1${REDACTED}`)
    result = result.replace(CONN_STRING_RE, `://$1:${REDACTED}@`)
    result = result.replace(API_KEY_PREFIX_RE, REDACTED)

    result = result.replace(HIGH_ENTROPY_RE, (match) => {
      if (isLikelySecret(match)) return REDACTED
      return match
    })

    return result
  } catch {
    return message
  }
}
