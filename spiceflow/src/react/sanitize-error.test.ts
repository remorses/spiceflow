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
