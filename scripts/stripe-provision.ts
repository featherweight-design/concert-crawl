/**
 * Concert Crawl — idempotent Stripe product + price provisioning
 * (eng infra spec Part 2 §1.2, execution plan PR 2.2).
 *
 * Provisions the three monetization prices, resolved by lookup_key (server
 * code never hard-codes price IDs — they differ across test/live):
 *
 *   supporter_monthly  Concert Crawl Supporter  $2.00/mo
 *   premium_monthly    Concert Crawl Premium    $5.00/mo
 *   founder_monthly    Concert Crawl Founder    $3.00/mo
 *
 * No trial configuration on any price — the 14-day trial is DB-side
 * (Part 1, Decision 6).
 *
 * Idempotency per lookup_key:
 *   - existing price matches amount/interval/currency → no-op (logged)
 *   - existing price MISMATCHES → exit non-zero with a loud error (prices
 *     are immutable in Stripe; a mismatch means human investigation)
 *   - absent → create product + price with the lookup_key
 *     (`transfer_lookup_key: true`)
 *
 * Usage (key from env, never pasted; run once per mode):
 *
 *   Dry run (default — resolves + reports, writes nothing):
 *     STRIPE_SECRET_KEY=sk_test_... tsx scripts/stripe-provision.ts --mode test
 *
 *   Commit:
 *     STRIPE_SECRET_KEY=sk_test_... tsx scripts/stripe-provision.ts --mode test --commit
 *
 * `--mode test | live` is a labeled sanity check against the key prefix
 * (sk_test_/sk_live_) — a mismatched key/mode pair aborts before any call.
 *
 * Webhook endpoint registration (`--webhooks`) ships in PR 2.3.
 */

import { pathToFileURL } from 'node:url'
import Stripe from 'stripe'
import {
  PROVISION_PRICES,
  assertKeyMatchesMode,
  parseMode,
  planPriceAction,
  type ExistingPriceSummary,
  type ProvisionMode,
} from './stripe-provision-helpers.js'

// Pinned to the installed stripe@22 SDK types (matches apps/api/src/lib/stripe.ts).
const STRIPE_API_VERSION = '2026-06-24.dahlia'

/**
 * Minimal structural boundary over the Stripe SDK slice this script uses,
 * so tests can stub without a key or network.
 */
export interface ProvisionStripeClient {
  prices: {
    list(params: { lookup_keys: string[]; active: boolean }): Promise<{
      data: {
        id: string
        unit_amount: number | null
        currency: string
        recurring: { interval: string } | null
      }[]
    }>
    create(params: {
      product: string
      unit_amount: number
      currency: string
      recurring: { interval: 'month' }
      lookup_key: string
      transfer_lookup_key: boolean
    }): Promise<{ id: string }>
  }
  products: {
    create(params: { name: string }): Promise<{ id: string }>
  }
}

export interface ProvisionSummary {
  mode: ProvisionMode
  committed: boolean
  noops: number
  created: number
  wouldCreate: number
}

export async function runProvision(
  opts: { mode: ProvisionMode; commit: boolean },
  stripe: ProvisionStripeClient,
): Promise<ProvisionSummary> {
  const summary: ProvisionSummary = {
    mode: opts.mode,
    committed: opts.commit,
    noops: 0,
    created: 0,
    wouldCreate: 0,
  }

  for (const spec of PROVISION_PRICES) {
    const listed = await stripe.prices.list({
      lookup_keys: [spec.lookupKey],
      active: true,
    })
    if (listed.data.length > 1) {
      // Multiple active prices sharing one lookup_key means Stripe state has
      // drifted from what this script provisions — planning against an
      // arbitrary data[0] could no-op or mismatch against the wrong price.
      throw new Error(
        `MULTIPLE ACTIVE PRICES for lookup_key "${spec.lookupKey}" ` +
          `(${listed.data.map((price) => price.id).join(', ')}) — ` +
          'expected at most one. Investigate the Stripe dashboard before re-running.',
      )
    }
    const existingRaw = listed.data[0] ?? null
    const existing: ExistingPriceSummary | null = existingRaw
      ? {
          id: existingRaw.id,
          unitAmount: existingRaw.unit_amount,
          interval: existingRaw.recurring?.interval ?? null,
          currency: existingRaw.currency,
        }
      : null

    const plan = planPriceAction(existing, spec)

    if (plan.action === 'noop') {
      summary.noops += 1
      console.log(
        `[noop] ${spec.lookupKey} → ${plan.priceId} already matches (${spec.unitAmountCents}¢ / ${spec.interval})`,
      )
      continue
    }

    if (plan.action === 'mismatch') {
      // Loud, non-zero exit via throw — prices are immutable in Stripe;
      // a mismatch means a human investigates, never an auto-fix.
      throw new Error(
        `PRICE MISMATCH for lookup_key "${spec.lookupKey}": ${plan.detail}. ` +
          'Stripe prices are immutable — investigate the dashboard before re-running.',
      )
    }

    if (!opts.commit) {
      summary.wouldCreate += 1
      console.log(
        `[dry-run] would create product "${spec.productName}" + price ${spec.lookupKey} ` +
          `(${spec.unitAmountCents}¢ ${spec.currency}/${spec.interval})`,
      )
      continue
    }

    const product = await stripe.products.create({ name: spec.productName })
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: spec.unitAmountCents,
      currency: spec.currency,
      recurring: { interval: spec.interval },
      lookup_key: spec.lookupKey,
      transfer_lookup_key: true,
    })
    summary.created += 1
    console.log(
      `[created] ${spec.lookupKey} → ${price.id} (product ${product.id}, ${spec.unitAmountCents}¢/${spec.interval})`,
    )
  }

  if (!opts.commit && summary.wouldCreate > 0) {
    console.log('---')
    console.log(
      'Dry-run mode — nothing written. Re-run with --commit to apply.',
    )
  }

  return summary
}

// CLI entrypoint guard so the module can be imported by a test without
// auto-running — same shape as the sibling scripts.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  try {
    const mode = parseMode(process.argv)
    const commit = process.argv.includes('--commit')
    const secretKey = process.env['STRIPE_SECRET_KEY'] ?? ''
    assertKeyMatchesMode(secretKey, mode)
    const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
    runProvision({ mode, commit }, stripe)
      .then((summary) => {
        console.log('---')
        console.log(JSON.stringify(summary, null, 2))
        process.exit(0)
      })
      .catch((err) => {
        console.error('Provisioning failed:', err)
        process.exit(1)
      })
  } catch (err) {
    console.error('Provisioning aborted:', err)
    process.exit(1)
  }
}
