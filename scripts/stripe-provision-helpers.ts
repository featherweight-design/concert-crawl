/**
 * Helpers for scripts/stripe-provision.ts, split out so the pure logic is
 * unit-testable without a Stripe client — mirrors the helpers/test split of
 * scripts/2026-07-11-gifted-comps-backfill-helpers.ts.
 */

export type ProvisionMode = 'test' | 'live'

export interface ProvisionPriceSpec {
  lookupKey: string
  productName: string
  unitAmountCents: number
  interval: 'month'
  currency: 'usd'
}

/**
 * The three monetization prices (eng infra spec Part 2 §1.2) — amounts
 * locked by #781 (Supporter $2 / Premium $5 / Founder $3, all monthly).
 */
export const PROVISION_PRICES: readonly ProvisionPriceSpec[] = [
  {
    lookupKey: 'supporter_monthly',
    productName: 'Concert Crawl Supporter',
    unitAmountCents: 200,
    interval: 'month',
    currency: 'usd',
  },
  {
    lookupKey: 'premium_monthly',
    productName: 'Concert Crawl Premium',
    unitAmountCents: 500,
    interval: 'month',
    currency: 'usd',
  },
  {
    lookupKey: 'founder_monthly',
    productName: 'Concert Crawl Founder',
    unitAmountCents: 300,
    interval: 'month',
    currency: 'usd',
  },
]

/**
 * Resolves the required `--mode test | live` argument (both `--mode test`
 * and `--mode=test` forms). Throws when absent or invalid — the mode is a
 * deliberate, labeled statement of intent, never defaulted.
 */
export const parseMode = (argv: readonly string[]): ProvisionMode => {
  let value: string | null = null
  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx]
    if (arg === '--mode') {
      value = argv[idx + 1] ?? null
      break
    }
    if (arg?.startsWith('--mode=')) {
      value = arg.slice('--mode='.length)
      break
    }
  }
  if (value === 'test' || value === 'live') return value
  throw new Error('Required argument: --mode test | live')
}

/**
 * Sanity-checks STRIPE_SECRET_KEY against the declared mode so a live key
 * can never be provisioned under a `--mode test` invocation (and vice
 * versa). Throws on empty key or prefix mismatch.
 */
export const assertKeyMatchesMode = (
  secretKey: string,
  mode: ProvisionMode,
): void => {
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required (never pasted — env only)')
  }
  const expectedPrefix = mode === 'test' ? 'sk_test_' : 'sk_live_'
  if (!secretKey.startsWith(expectedPrefix)) {
    throw new Error(
      `STRIPE_SECRET_KEY does not match --mode ${mode} (expected a ${expectedPrefix}… key)`,
    )
  }
}

/**
 * The exact enabled_events set for the webhook endpoint (eng infra spec
 * Part 2 §1.5). Kept in lockstep with HANDLED_STRIPE_EVENTS in
 * apps/api/src/routes/stripe-webhooks.ts — both sides pin the same literal
 * list in their unit tests, so drift fails a test on whichever side moved.
 */
export const WEBHOOK_ENABLED_EVENTS: readonly string[] = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payment_intent.payment_failed',
  'customer.updated',
  'payment_method.attached',
]

/**
 * Resolves the optional `--webhooks <url>` argument (both `--webhooks url`
 * and `--webhooks=url` forms). Returns null when the flag is absent; throws
 * when the flag is present without a valid https URL.
 */
export const parseWebhooksUrl = (argv: readonly string[]): string | null => {
  let value: string | null = null
  let flagSeen = false
  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx]
    if (arg === '--webhooks') {
      flagSeen = true
      value = argv[idx + 1] ?? null
      break
    }
    if (arg?.startsWith('--webhooks=')) {
      flagSeen = true
      value = arg.slice('--webhooks='.length)
      break
    }
  }
  if (!flagSeen) return null
  if (!value || value.startsWith('--')) {
    throw new Error('--webhooks requires a URL argument')
  }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch (err) {
    throw new Error(`--webhooks URL is not a valid URL: ${String(err)}`)
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('--webhooks URL must be https (Stripe requirement)')
  }
  return value
}

export interface ExistingPriceSummary {
  id: string
  unitAmount: number | null
  interval: string | null
  currency: string | null
}

export type PriceAction =
  | { action: 'noop'; priceId: string }
  | { action: 'create' }
  | { action: 'mismatch'; detail: string }

/**
 * Idempotency decision for one lookup_key (spec §1.2): matching existing
 * price → no-op; absent → create; mismatched amount/interval/currency →
 * mismatch (prices are immutable in Stripe — the caller exits non-zero so
 * a human investigates; never auto-fix).
 */
export const planPriceAction = (
  existing: ExistingPriceSummary | null,
  desired: ProvisionPriceSpec,
): PriceAction => {
  if (existing === null) return { action: 'create' }
  const mismatches: string[] = []
  if (existing.unitAmount !== desired.unitAmountCents) {
    mismatches.push(
      `unit_amount is ${String(existing.unitAmount)}, expected ${desired.unitAmountCents}`,
    )
  }
  if (existing.interval !== desired.interval) {
    mismatches.push(
      `interval is ${String(existing.interval)}, expected ${desired.interval}`,
    )
  }
  if (existing.currency !== desired.currency) {
    mismatches.push(
      `currency is ${String(existing.currency)}, expected ${desired.currency}`,
    )
  }
  if (mismatches.length > 0) {
    return { action: 'mismatch', detail: mismatches.join('; ') }
  }
  return { action: 'noop', priceId: existing.id }
}
