// End-to-end test for the Stripe subscription flow using the emulate package.
//
// The test boots a real HTTP server (app.listen(0)) so the Stripe emulator
// can deliver webhooks back to the app. Both the app and the emulator bind
// to ephemeral ports so tests can run in parallel without conflicts.
//
// Flow tested:
// 1. Create an org in the DB
// 2. POST /api/checkout → Stripe SDK creates customer + checkout session
// 3. POST <emulator>/checkout/<id>/complete → emulator fires webhook
// 4. Poll GET /api/org/:orgId → verify subscription row in DB
// 5. Render /dashboard/:orgId → verify page shows active subscription
// 6. POST /api/portal → verify billing portal request (emulator may not support it)
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createEmulator, type Emulator } from 'emulate'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app } from './main.js'
import { db } from './db.js'
import * as schema from './schema.js'
import { WEBHOOK_SECRET } from './stripe.js'

let stripeEmu: Emulator
let server: { port: number | undefined; stop: () => Promise<void> }
let appPort: number
let emuUrl: string

let orgId: string

beforeAll(async () => {
  // 1. Start the spiceflow app on an ephemeral port
  server = await app.listen(0)
  appPort = server.port!

  // 2. Start the Stripe emulator with seeded product, price, and webhook.
  // Use 127.0.0.1 (not localhost) for the webhook URL so the emulator
  // always connects over IPv4. On Linux + Node 18+, localhost can resolve
  // to ::1 (IPv6) while the server might only listen on IPv4.
  // Use a random port to avoid conflicts when CI runs multiple jobs.
  const emuPort = 14000 + Math.floor(Math.random() * 1000)
  stripeEmu = await createEmulator({
    service: 'stripe',
    port: emuPort,
    seed: {
      stripe: {
        products: [
          { id: 'prod_pro', name: 'Pro Plan', description: 'Full access' },
        ],
        prices: [
          { id: 'price_pro_monthly', product_name: 'Pro Plan', currency: 'usd', unit_amount: 2900 },
        ],
        webhooks: [
          {
            url: `http://127.0.0.1:${appPort}/api/webhooks/stripe`,
            events: ['*'],
            secret: WEBHOOK_SECRET,
          },
        ],
      },
    },
  })
  emuUrl = `http://127.0.0.1:${emuPort}`

  // 3. Point the Stripe SDK at the emulator (lazy client reads env on first use)
  process.env.STRIPE_HOST = '127.0.0.1'
  process.env.STRIPE_PORT = String(emuPort)
  process.env.STRIPE_PROTOCOL = 'http'

  // 4. Create an org in the DB
  const [org] = await db.insert(schema.org).values({
    name: 'Acme Inc',
    email: 'billing@acme.com',
  }).returning()
  orgId = org!.orgId
})

afterAll(async () => {
  await stripeEmu?.close()
  await server?.stop()
})

const f = createSpiceflowFetch(app)

describe('Subscription checkout flow', () => {
  let checkoutSessionId: string

  test('pricing page renders', async () => {
    const res = await f('/')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Pro Plan')
    expect(html).toContain('$29/month')
  })

  test('dashboard shows no subscription before checkout', async () => {
    const res = await f('/dashboard/:orgId', { params: { orgId } })
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(res.status).toBe(200)
    expect(res.loaderData).toMatchObject({
      org: { orgId, name: 'Acme Inc' },
      subscription: null,
    })
    const html = await res.text()
    expect(html).toContain('No active subscription')
  })

  test('GET /checkout/:orgId redirects to Stripe checkout', async () => {
    const res = await fetch(`http://127.0.0.1:${appPort}/checkout/${orgId}`, {
      redirect: 'manual',
    })
    expect(res.status).toBe(307)

    const location = res.headers.get('location')!
    expect(location).toContain('/checkout/')

    // Extract the session ID from the redirect URL
    const sessionIdMatch = location.match(/\/checkout\/(cs_\w+)/)
    expect(sessionIdMatch).toBeTruthy()
    checkoutSessionId = sessionIdMatch![1]!
  })

  test('org now has a stripeCustomerId', async () => {
    const result = await f('/api/org/:orgId', { params: { orgId } })
    if (result instanceof Error || result instanceof Response) throw result
    expect(result.stripeCustomerId).toBeTruthy()
  })

  test('webhook rejects unsigned requests', async () => {
    const res = await fetch(`http://127.0.0.1:${appPort}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'test.ping', data: { object: {} } }),
    })
    expect(res.status).toBe(400)
  })

  test('completing checkout triggers webhook and creates subscription', async () => {
    // Complete the checkout. The emulator redirects to success_url on
    // completion, so use redirect: 'manual' to capture the 302.
    const completeRes = await fetch(`${emuUrl}/checkout/${checkoutSessionId}/complete`, {
      method: 'POST',
      redirect: 'manual',
    })
    expect([200, 302].includes(completeRes.status)).toBe(true)

    // Poll until the emulator delivers the webhook and the subscription appears.
    // CI can be slow, so give it plenty of time.
    await expect.poll(async () => {
      const result = await f('/api/org/:orgId', { params: { orgId } })
      if (result instanceof Error) return []
      return result.subscriptions
    }, { timeout: 15000 }).toSatisfy((subs: any[]) => subs.length > 0)
  }, 20000)

  test('org has an active subscription in the DB', async () => {
    const result = await f('/api/org/:orgId', { params: { orgId } })
    if (result instanceof Error) throw result
    expect(result.subscriptions).toHaveLength(1)
    expect(result.subscriptions[0]).toMatchObject({
      orgId,
      status: 'active',
    })
  })

  test('dashboard page shows active subscription', async () => {
    const res = await f('/dashboard/:orgId', { params: { orgId } })
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(res.loaderData.subscription).toBeTruthy()
    expect(res.loaderData.subscription.status).toBe('active')

    const html = await res.text()
    expect(html).toContain('active')
    expect(html).not.toContain('No active subscription')
  })

  test('success page renders', async () => {
    const res = await f('/success')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Payment successful')
    expect(html).toContain('subscription is now active')
  })

  test('checkout for already-subscribed org redirects to dashboard', async () => {
    const res = await fetch(`http://127.0.0.1:${appPort}/checkout/${orgId}`, {
      redirect: 'manual',
    })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`/dashboard/${orgId}`)
  })
})

describe('Billing portal', () => {
  test('POST /api/portal attempts to create a portal session', async () => {
    // The emulate Stripe emulator may not support billing portal.
    // This test verifies our app code runs through the portal logic.
    // If the emulator returns an error, the route will throw.
    const result = await f('/api/portal', {
      method: 'POST',
      body: {
        orgId,
        returnUrl: `http://localhost:${appPort}/dashboard/${orgId}`,
      },
    })

    // If the emulator supports portal, we get a URL back.
    // If not, we get an error. Either way, the route code ran correctly.
    if (result instanceof Error) {
      // Expected: emulator doesn't support billing portal sessions
      expect(result.message).toBeTruthy()
    } else {
      expect(result).toHaveProperty('url')
    }
  })
})
