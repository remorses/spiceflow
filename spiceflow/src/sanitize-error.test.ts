import { describe, test, expect } from 'vitest'
import { sanitizeErrorMessage } from './sanitize-error.js'

describe('sanitizeErrorMessage', () => {
  test('normal error messages pass through unchanged', () => {
    expect(
      sanitizeErrorMessage('Server component error'),
    ).toMatchInlineSnapshot(`"Server component error"`)
    expect(
      sanitizeErrorMessage('Cannot read properties of undefined'),
    ).toMatchInlineSnapshot(`"Cannot read properties of undefined"`)
    expect(
      sanitizeErrorMessage('useState only works in Client Components'),
    ).toMatchInlineSnapshot(`"useState only works in Client Components"`)
    expect(
      sanitizeErrorMessage('ENOENT: no such file or directory'),
    ).toMatchInlineSnapshot(`"ENOENT: no such file or directory"`)
    expect(
      sanitizeErrorMessage(
        'Basic authentication failed: invalid token: expired, Bearer realm missing',
      ),
    ).toMatchInlineSnapshot(`"Basic authentication failed: invalid token: expired, Bearer realm missing"`)
    expect(sanitizeErrorMessage('')).toMatchInlineSnapshot(`""`)
  })

  test('JWT tokens are redacted', () => {
    expect(
      sanitizeErrorMessage(
        'Auth failed: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      ),
    ).toMatchInlineSnapshot(`"Auth failed: [REDACTED]"`)
  })

  test('Bearer tokens are redacted', () => {
    expect(
      sanitizeErrorMessage(
        'Authorization: Bearer ghp_xYz1234567890abcdefghijklmnop',
      ),
    ).toMatchInlineSnapshot(`"Authorization: Bearer [REDACTED]"`)
  })

  test('connection string credentials are redacted', () => {
    expect(
      sanitizeErrorMessage(
        'Failed to connect: postgres://admin:s3cretPassw0rd@db.example.com:5432/mydb',
      ),
    ).toMatchInlineSnapshot(
      `"Failed to connect: postgres://admin:[REDACTED]@db.example.com:5432/mydb"`,
    )
    expect(
      sanitizeErrorMessage(
        'redis://default:myRedisPassword123@redis.internal:6379',
      ),
    ).toMatchInlineSnapshot(`"redis://default:[REDACTED]@redis.internal:6379"`)
  })

  test('API key prefixes are redacted', () => {
    expect(
      sanitizeErrorMessage('Invalid key: sk-1234567890abcdefghij'),
    ).toMatchInlineSnapshot(`"Invalid key: [REDACTED]"`)
    expect(
      sanitizeErrorMessage('Token: sk_live_abc123def456ghi789jkl012'),
    ).toMatchInlineSnapshot(`"Token: [REDACTED]"`)
    expect(
      sanitizeErrorMessage('Bad token ghp_ABCDEFghijklmnopqrstuvwxyz1234'),
    ).toMatchInlineSnapshot(`"Bad token [REDACTED]"`)
    expect(
      sanitizeErrorMessage('Slack: xoxb-123456789012-abcdefgh'),
    ).toMatchInlineSnapshot(`"Slack: [REDACTED]"`)
    expect(
      sanitizeErrorMessage('AWS: AKIAIOSFODNN7EXAMPLE'),
    ).toMatchInlineSnapshot(`"AWS: [REDACTED]"`)
    expect(
      sanitizeErrorMessage('Stripe: pk_test_TYooMQauvdEDq54NiTphI7jx'),
    ).toMatchInlineSnapshot(`"Stripe: [REDACTED]"`)
  })

  test('token= params are redacted', () => {
    expect(
      sanitizeErrorMessage(
        'Request to https://api.example.com?token=abc123def456ghi789 failed',
      ),
    ).toMatchInlineSnapshot(
      `"Request to https://api.example.com?token=[REDACTED] failed"`,
    )
  })

  test('high-entropy strings are redacted', () => {
    expect(
      sanitizeErrorMessage('Key: A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6'),
    ).toMatchInlineSnapshot(`"Key: [REDACTED]"`)
  })

  test('normal code identifiers are NOT redacted', () => {
    expect(
      sanitizeErrorMessage('renderToReadableStream'),
    ).toMatchInlineSnapshot(`"renderToReadableStream"`)
    expect(
      sanitizeErrorMessage('getDerivedStateFromError'),
    ).toMatchInlineSnapshot(`"getDerivedStateFromError"`)
    expect(sanitizeErrorMessage('my_variable_name')).toMatchInlineSnapshot(
      `"my_variable_name"`,
    )
    expect(
      sanitizeErrorMessage('spiceflow/src/react/entry.ssr.tsx'),
    ).toMatchInlineSnapshot(`"spiceflow/src/react/entry.ssr.tsx"`)
  })

  test('stack trace with many secret formats keeps paths and words readable', () => {
    const stack = [
      'Error: Upstream failed for /select-account with Bearer abcDEF123456ghiJKL and token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      '  url: https://api.example.com/v1?token=abc123def456ghi789&access_token=ya29abc123def456&api_key=key123456789&client_secret=cs_abcdef123456',
      '  s3: https://bucket.s3.amazonaws.com/k?X-Amz-Signature=abc123def456abc123def456 password=hunter2hunter2',
      '  db: postgres://user:pass@db.internal:5432/app and redis://:redispw@cache:6379',
      '  keys: sk_live_51Habcdefghijklmnop ghp_ABCDEFghijklmnopqrstuvwxyz1234 sha 3f786850e387550fdab836ed7e6dc881de23001b',
      '  b64: dGhpcyBpcyBhIHNlY3JldCBrZXkgd2l0aCsrLz0 Authorization: Basic dXNlcjpwYXNzd29yZA== Cookie: session=abc123def456ghi789',
      '  headers: x-api-key: abcdef1234567890abcdef {"password":"hunter2","apiKey":"abc123def456"}',
      '  request id 550e8400-e29b-41d4-a716-446655440000',
      '    at loadAccount (/Users/morse/Documents/GitHub/spiceflow-rsc/node_modules/.pnpm/react-server-dom-webpack@19.2.0/cjs/server.js:12:4)',
      '    at /select-account (file:///app/dist/rsc/assets/index-DlK3m9Zq.js:34521:19)',
      '    at async Spiceflow.handle (/app/node_modules/spiceflow/dist/spiceflow.js:2400:7)',
    ].join('\n')
    expect('\n' + sanitizeErrorMessage(stack)).toMatchInlineSnapshot(`
      "
      Error: Upstream failed for /select-account with Bearer [REDACTED] and token [REDACTED]
        url: https://api.example.com/v1?token=[REDACTED]&access_token=[REDACTED]&api_key=[REDACTED]&client_secret=[REDACTED]
        s3: https://bucket.s3.amazonaws.com/k?X-Amz-Signature=[REDACTED] password=[REDACTED]
        db: postgres://user:[REDACTED]@db.internal:5432/app and redis://:[REDACTED]@cache:6379
        keys: [REDACTED] [REDACTED] sha [REDACTED]
        b64: [REDACTED] Authorization: Basic [REDACTED] Cookie: [REDACTED]
        headers: x-api-key: [REDACTED] {"password":"[REDACTED]","apiKey":"[REDACTED]"}
        request id 550e8400-e29b-41d4-a716-446655440000
          at loadAccount (/Users/morse/Documents/GitHub/spiceflow-rsc/node_modules/.pnpm/react-server-dom-webpack@19.2.0/cjs/server.js:12:4)
          at /select-account (file:///app/dist/rsc/assets/index-DlK3m9Zq.js:34521:19)
          at async Spiceflow.handle (/app/node_modules/spiceflow/dist/spiceflow.js:2400:7)"
    `)
  })

  test('credential headers redact plain-letter values', () => {
    expect(
      sanitizeErrorMessage(
        'Authorization: Bearer supersecretvalue x-api-key: abcdefghijklmnopqrstuvwxyz authorization: plainsecret',
      ),
    ).toMatchInlineSnapshot(`"Authorization: Bearer [REDACTED] x-api-key: [REDACTED] authorization: [REDACTED]"`)
  })

  test('adversarial input stays linear', () => {
    const inputs = [
      'a-'.repeat(100_000),
      '-----BEGIN PRIVATE KEY-----'.repeat(5_000),
      'eyJ'.repeat(30_000),
      'a-a-a-token'.repeat(10_000),
    ]
    const start = performance.now()
    for (const input of inputs) sanitizeErrorMessage(input)
    expect(performance.now() - start).toBeLessThan(1_000)
  })

  test('mixed message keeps text and redacts secrets', () => {
    expect(
      sanitizeErrorMessage(
        'Database connection failed: postgres://root:MyS3cretP4ssw0rd!@prod.db.example.com:5432/app, please check credentials',
      ),
    ).toMatchInlineSnapshot(
      `"Database connection failed: postgres://root:[REDACTED]@prod.db.example.com:5432/app, please check credentials"`,
    )
  })
})
