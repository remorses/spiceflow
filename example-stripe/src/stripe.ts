// Stripe SDK client and helpers.
// Configurable via env vars so the SDK can be pointed at the emulate server
// in tests, and at real Stripe in production.
//
// Best practices:
// - single Stripe customer per org via getOrCreateStripeCustomer
// - price_data inline in checkout (no pre-created Price objects needed)
// - webhook signature verification via constructEvent
// - idempotent subscription upserts in webhook handler
import Stripe from 'stripe'
import * as orm from 'drizzle-orm'
import { db } from './db.js'
import * as schema from './schema.js'

// --- SDK client ---
// Lazy singleton so env vars (STRIPE_HOST, STRIPE_PORT, STRIPE_PROTOCOL)
// can be set in test beforeAll before the first Stripe call.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const config: Stripe.StripeConfig = {}
  if (process.env.STRIPE_HOST) {
    Object.assign(config, {
      host: process.env.STRIPE_HOST,
      port: parseInt(process.env.STRIPE_PORT ?? '4010'),
      protocol: (process.env.STRIPE_PROTOCOL as 'http' | 'https') ?? 'http',
    })
  }

  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_emulated', config)
  return _stripe
}

// Reset the cached client (used between tests when env changes)
export function resetStripeClient() {
  _stripe = null
}

// --- Webhook secret ---
// Set via STRIPE_WEBHOOK_SECRET env var. In tests, we generate signed
// payloads using Stripe's test helper.
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_secret'

// --- Get or create Stripe customer ---
// This is the ONLY place in the codebase where stripe.customers.create
// should be called. One Stripe customer per org, stored in org.stripeCustomerId.
export async function getOrCreateStripeCustomer(orgId: string): Promise<string> {
  const existingOrg = await db.query.org.findFirst({
    where: { orgId },
  })
  if (!existingOrg) throw new Error(`Org ${orgId} not found`)

  if (existingOrg.stripeCustomerId) return existingOrg.stripeCustomerId

  const customer = await getStripe().customers.create({
    email: existingOrg.email,
    metadata: { orgId },
  })

  await db
    .update(schema.org)
    .set({ stripeCustomerId: customer.id })
    .where(orm.eq(schema.org.orgId, orgId))

  return customer.id
}

// --- Webhook: handle checkout.session.completed ---
// Creates or updates the subscription row in the DB from the completed
// checkout session. Uses upsert so webhook retries are idempotent.
export async function handleCheckoutCompleted(sessionObj: Stripe.Checkout.Session) {
  const orgId = sessionObj.metadata?.orgId ?? sessionObj.client_reference_id
  if (!orgId) {
    console.warn('checkout.session.completed: no orgId in metadata or client_reference_id')
    return
  }

  // The emulator may not populate session.subscription, so we use the
  // session ID as a fallback subscription identifier.
  const subscriptionId =
    typeof sessionObj.subscription === 'string'
      ? sessionObj.subscription
      : sessionObj.subscription?.id ?? sessionObj.id

  // Extract line item info. The emulator might not expand line_items,
  // so provide sensible defaults.
  const lineItem = sessionObj.line_items?.data?.[0]
  const priceId = lineItem?.price?.id ?? 'unknown'
  const productId =
    typeof lineItem?.price?.product === 'string'
      ? lineItem.price.product
      : lineItem?.price?.product?.id ?? 'unknown'

  const record = {
    subscriptionId,
    variantId: priceId,
    productId,
    customerId: typeof sessionObj.customer === 'string' ? sessionObj.customer : null,
    orgId,
    status: 'active' as const,
    createdAt: Date.now(),
  }

  await db
    .insert(schema.subscription)
    .values(record)
    .onConflictDoUpdate({
      target: [schema.subscription.subscriptionId, schema.subscription.variantId],
      set: { status: record.status, customerId: record.customerId },
    })
}
