import { describe, test, expect } from 'vitest'

const BASE_URL = 'https://spiceflow-split-worker-example.remorses.workers.dev'

function req(path: string) {
  return fetch(`${BASE_URL}${path}`)
}

describe('root routes', () => {
  test('GET / returns root message', async () => {
    const res = await req('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ message: 'root app' })
  })

  test('GET /health returns ok', async () => {
    const res = await req('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})

describe('split sub-app: /admin', () => {
  test('GET /admin/users returns users list', async () => {
    const res = await req('/admin/users')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('users')
    expect(body.users.length).toBeGreaterThan(0)
  })

  test('GET /admin/users/:id returns single user', async () => {
    const res = await req('/admin/users/42')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('user')
    expect(body.user.id).toBe('42')
  })

  test('GET /admin/stats returns stats', async () => {
    const res = await req('/admin/stats')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('totalUsers')
    expect(body).toHaveProperty('activeUsers')
  })

  test('GET /admin/nonexistent returns 404', async () => {
    const res = await req('/admin/nonexistent')
    expect(res.status).toBe(404)
  })
})

describe('split sub-app: /billing', () => {
  test('GET /billing/invoices returns invoices list', async () => {
    const res = await req('/billing/invoices')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('invoices')
    expect(body.invoices).toHaveLength(2)
  })

  test('GET /billing/invoices/:id returns single invoice', async () => {
    const res = await req('/billing/invoices/inv_001')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('invoice')
    expect(body.invoice.id).toBe('inv_001')
  })
})

describe('parent middleware applies to split sub-apps', () => {
  test('root route gets x-app header from middleware', async () => {
    const res = await req('/')
    expect(res.headers.get('x-app')).toBe('split-worker')
  })

  test('admin split sub-app gets x-app header from parent middleware', async () => {
    const res = await req('/admin/users')
    expect(res.headers.get('x-app')).toBe('split-worker')
  })

  test('billing split sub-app gets x-app header from parent middleware', async () => {
    const res = await req('/billing/invoices')
    expect(res.headers.get('x-app')).toBe('split-worker')
  })

  test('admin stats gets x-app header from parent middleware', async () => {
    const res = await req('/admin/stats')
    expect(res.headers.get('x-app')).toBe('split-worker')
  })
})


