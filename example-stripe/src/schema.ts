// Drizzle SQLite schema for the Stripe example.
// Two tables: org (with stripeCustomerId) and subscription (keyed by Stripe sub ID).
// Follows the "one Stripe customer per org" pattern from the stripe skill.
import { defineRelations } from 'drizzle-orm'
import * as s from 'drizzle-orm/sqlite-core'
import { ulid } from 'ulid'

export const org = s.sqliteTable('org', {
  orgId: s.text('org_id').primaryKey().$defaultFn(() => ulid()),
  name: s.text('name').notNull(),
  email: s.text('email').notNull(),
  stripeCustomerId: s.text('stripe_customer_id'),
  createdAt: s.integer('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
})

export const subscription = s.sqliteTable(
  'subscription',
  {
    subscriptionId: s.text('subscription_id').notNull(),
    variantId: s.text('variant_id').notNull(),
    productId: s.text('product_id').notNull(),
    customerId: s.text('customer_id'),
    orgId: s.text('org_id').notNull().references(() => org.orgId, { onDelete: 'cascade' }),
    status: s.text('status', {
      enum: ['active', 'trialing', 'canceled', 'past_due', 'unpaid', 'incomplete'],
    }).notNull(),
    createdAt: s.integer('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  },
  (table) => [
    s.primaryKey({ columns: [table.subscriptionId, table.variantId] }),
    s.index('subscription_org_id_idx').on(table.orgId),
  ],
)

export const relations = defineRelations({ org, subscription }, (r) => ({
  org: {
    subscriptions: r.many.subscription(),
  },
  subscription: {
    org: r.one.org({
      from: r.subscription.orgId,
      to: r.org.orgId,
    }),
  },
}))
