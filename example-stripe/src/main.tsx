// Spiceflow app demonstrating Stripe subscription checkout with emulate.
//
// Pages: pricing (/), success (/success), dashboard (/dashboard/:orgId)
// Actions: subscribe (creates checkout session), manageSubscription (opens portal)
// Webhook: POST /api/webhooks/stripe (handles checkout.session.completed)
//
// The Stripe SDK is configured via env vars so it can be pointed at the
// emulate server in tests and at real Stripe in production.
import { Spiceflow } from 'spiceflow'
import { Head } from 'spiceflow/react'
import { db } from './db.js'
import * as schema from './schema.js'
import { createHmac } from 'node:crypto'
import {
  getStripe,
  getOrCreateStripeCustomer,
  handleCheckoutCompleted,
  WEBHOOK_SECRET,
} from './stripe.js'

export const app = new Spiceflow()
  // --- Layout ---
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>Stripe Example</Head.Title>
        </Head>
        <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
          {children}
        </body>
      </html>
    )
  })

  // --- Pricing page ---
  .page('/', async function PricingPage() {
    return (
      <div>
        <h1>Pro Plan</h1>
        <p>Get access to all features with a Pro subscription.</p>
        <ul>
          <li>Unlimited projects</li>
          <li>Priority support</li>
          <li>Advanced analytics</li>
        </ul>
        <p>
          <strong>$29/month</strong> or <strong>$290/year</strong>
        </p>
      </div>
    )
  })

  // --- Success page ---
  .page('/success', async function SuccessPage() {
    return (
      <div>
        <h1>Payment successful</h1>
        <p>Your subscription is now active. You can manage it from your dashboard.</p>
      </div>
    )
  })

  // --- Dashboard page with subscription status ---
  .loader('/dashboard/:orgId', async ({ params }) => {
    const org = await db.query.org.findFirst({
      where: { orgId: params.orgId },
      with: { subscriptions: true },
    })
    if (!org) return { org: null as null, subscription: null as null }

    const activeSub = org.subscriptions.find(
      (s) => s.status === 'active' || s.status === 'trialing',
    )
    return {
      org: { orgId: org.orgId, name: org.name, email: org.email },
      subscription: activeSub
        ? { subscriptionId: activeSub.subscriptionId, status: activeSub.status, productId: activeSub.productId }
        : null,
    }
  })
  .page('/dashboard/:orgId', async function DashboardPage({ loaderData }) {
    if (!loaderData.org) {
      return (
        <div>
          <h1>Not Found</h1>
          <p>Organization not found.</p>
        </div>
      )
    }
    return (
      <div>
        <h1>{loaderData.org.name}</h1>
        <p>Email: {loaderData.org.email}</p>
        {loaderData.subscription ? (
          <div data-testid="subscription-status">
            <h2>Subscription</h2>
            <p>Status: <strong>{loaderData.subscription.status}</strong></p>
            <p>ID: {loaderData.subscription.subscriptionId}</p>
          </div>
        ) : (
          <div data-testid="no-subscription">
            <p>No active subscription. Visit the pricing page to subscribe.</p>
          </div>
        )}
      </div>
    )
  })

  // --- Checkout redirect ---
  // GET /checkout/:orgId → creates a Stripe Checkout Session and redirects
  // to the hosted checkout page. In production, resolve the price via
  // lookup_key instead of hardcoding the ID.
  .get('/checkout/:orgId', async ({ params, request, redirect }) => {
    const url = new URL(request.url)
    const origin = url.origin

    const customerId = await getOrCreateStripeCustomer(params.orgId)

    // Already subscribed? Redirect to dashboard instead.
    const existing = await db.query.subscription.findFirst({
      where: { orgId: params.orgId, status: 'active' },
    })
    if (existing) {
      throw redirect(`/dashboard/${params.orgId}`)
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
      success_url: `${origin}/success`,
      cancel_url: `${origin}/`,
      client_reference_id: params.orgId,
      metadata: { orgId: params.orgId },
      subscription_data: { metadata: { orgId: params.orgId } },
    })

    if (!session.url) throw new Error('Checkout session has no URL')
    throw redirect(session.url)
  })

  // --- API: Create billing portal session ---
  // Opens the Stripe Billing Portal for an existing subscriber.
  .post('/api/portal', async ({ request }) => {
    const body = (await request.json()) as {
      orgId: string
      returnUrl: string
    }

    const customerId = await getOrCreateStripeCustomer(body.orgId)

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: body.returnUrl,
    })

    return { url: portalSession.url }
  })

  // --- API: Get org with subscription status ---
  .get('/api/org/:orgId', async ({ params }) => {
    const org = await db.query.org.findFirst({
      where: { orgId: params.orgId },
      with: { subscriptions: true },
    })
    if (!org) return new Response('Not Found', { status: 404 })
    return {
      orgId: org.orgId,
      name: org.name,
      email: org.email,
      stripeCustomerId: org.stripeCustomerId,
      subscriptions: org.subscriptions,
    }
  })

  // --- Webhook ---
  // Verifies signature before processing. Supports two formats:
  // - Production: Stripe's stripe-signature header (verified via constructEvent)
  // - Emulator: X-Hub-Signature-256 header (HMAC-SHA256, same secret)
  // Always read raw body with request.text() first; JSON parsing breaks HMAC.
  .post('/api/webhooks/stripe', async ({ request }) => {
    const rawBody = await request.text()
    const stripeSig = request.headers.get('stripe-signature')
    const hubSig = request.headers.get('x-hub-signature-256')


    if (stripeSig) {
      // Production path: Stripe signature verification
      try {
        getStripe().webhooks.constructEvent(rawBody, stripeSig, WEBHOOK_SECRET)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return new Response(`Webhook signature verification failed: ${message}`, { status: 400 })
      }
    } else if (hubSig) {
      // Emulator path: HMAC-SHA256 verification (emulate uses X-Hub-Signature-256)
      const expected = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
      if (hubSig !== expected) {
        return new Response('Webhook signature verification failed', { status: 400 })
      }
    } else {
      return new Response('Missing signature header', { status: 400 })
    }

    const body = JSON.parse(rawBody) as { type: string; data: { object: any } }

    if (body.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(body.data.object)
    }

    return { received: true }
  })

export type App = typeof app

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
