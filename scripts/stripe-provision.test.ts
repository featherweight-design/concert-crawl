import { describe, it, expect } from 'vitest'
import {
  PROVISION_PRICES,
  WEBHOOK_ENABLED_EVENTS,
  assertKeyMatchesMode,
  parseMode,
  parseWebhooksUrl,
  planPriceAction,
  type ProvisionPriceSpec,
} from './stripe-provision-helpers.js'
import {
  runProvision,
  runWebhookProvision,
  type ProvisionStripeClient,
} from './stripe-provision.js'

const unusedWebhookEndpoints: ProvisionStripeClient['webhookEndpoints'] = {
  list: async () => {
    throw new Error('webhookEndpoints.list not used in this test')
  },
  create: async () => {
    throw new Error('webhookEndpoints.create not used in this test')
  },
}

const SUPPORTER: ProvisionPriceSpec = {
  lookupKey: 'supporter_monthly',
  productName: 'Concert Crawl Supporter',
  unitAmountCents: 200,
  interval: 'month',
  currency: 'usd',
}

describe('PROVISION_PRICES', () => {
  it('carries the #781 locked pricing table', () => {
    expect(
      PROVISION_PRICES.map((price) => [
        price.lookupKey,
        price.unitAmountCents,
        price.interval,
        price.currency,
      ]),
    ).toEqual([
      ['supporter_monthly', 200, 'month', 'usd'],
      ['premium_monthly', 500, 'month', 'usd'],
      ['founder_monthly', 300, 'month', 'usd'],
    ])
  })
})

describe('parseMode', () => {
  it('parses --mode test and --mode live (space form)', () => {
    expect(parseMode(['node', 'script.ts', '--mode', 'test'])).toBe('test')
    expect(parseMode(['node', 'script.ts', '--mode', 'live'])).toBe('live')
  })

  it('parses --mode=test (equals form)', () => {
    expect(parseMode(['--mode=test'])).toBe('test')
    expect(parseMode(['--mode=live'])).toBe('live')
  })

  it('throws when --mode is absent', () => {
    expect(() => parseMode(['--commit'])).toThrow(/--mode/)
  })

  it('throws on an invalid mode value', () => {
    expect(() => parseMode(['--mode', 'prod'])).toThrow(/--mode/)
    expect(() => parseMode(['--mode='])).toThrow(/--mode/)
    expect(() => parseMode(['--mode'])).toThrow(/--mode/)
  })
})

describe('assertKeyMatchesMode', () => {
  it('accepts sk_test_ keys in test mode', () => {
    expect(() => assertKeyMatchesMode('sk_test_abc', 'test')).not.toThrow()
  })

  it('accepts sk_live_ keys in live mode', () => {
    expect(() => assertKeyMatchesMode('sk_live_abc', 'live')).not.toThrow()
  })

  it('rejects a live key under --mode test', () => {
    expect(() => assertKeyMatchesMode('sk_live_abc', 'test')).toThrow(
      /sk_test_/,
    )
  })

  it('rejects a test key under --mode live', () => {
    expect(() => assertKeyMatchesMode('sk_test_abc', 'live')).toThrow(
      /sk_live_/,
    )
  })

  it('rejects an empty key', () => {
    expect(() => assertKeyMatchesMode('', 'test')).toThrow(/STRIPE_SECRET_KEY/)
  })
})

describe('planPriceAction', () => {
  it('returns create when no price exists for the lookup key', () => {
    expect(planPriceAction(null, SUPPORTER)).toEqual({ action: 'create' })
  })

  it('returns noop when the existing price matches amount + interval + currency', () => {
    expect(
      planPriceAction(
        { id: 'price_1', unitAmount: 200, interval: 'month', currency: 'usd' },
        SUPPORTER,
      ),
    ).toEqual({ action: 'noop', priceId: 'price_1' })
  })

  it('returns mismatch on a different amount (prices are immutable)', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: 250, interval: 'month', currency: 'usd' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
    if (result.action === 'mismatch') {
      expect(result.detail).toContain('unit_amount')
    }
  })

  it('returns mismatch on a different interval', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: 200, interval: 'year', currency: 'usd' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
  })

  it('returns mismatch on a different currency', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: 200, interval: 'month', currency: 'eur' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
  })

  it('returns mismatch when unitAmount is null', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: null, interval: 'month', currency: 'usd' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
  })
})

describe('runProvision', () => {
  it('fails loudly when multiple active prices share a lookup_key', async () => {
    const stripeStub: ProvisionStripeClient = {
      prices: {
        list: async () => ({
          data: [
            {
              id: 'price_a',
              unit_amount: 200,
              currency: 'usd',
              recurring: { interval: 'month' },
            },
            {
              id: 'price_b',
              unit_amount: 200,
              currency: 'usd',
              recurring: { interval: 'month' },
            },
          ],
        }),
        create: async () => {
          throw new Error('should not create when the list is ambiguous')
        },
      },
      products: {
        create: async () => {
          throw new Error('should not create when the list is ambiguous')
        },
      },
      webhookEndpoints: unusedWebhookEndpoints,
    }

    await expect(
      runProvision({ mode: 'test', commit: false }, stripeStub),
    ).rejects.toThrow(/MULTIPLE ACTIVE PRICES.*price_a, price_b/)
  })
})

describe('WEBHOOK_ENABLED_EVENTS', () => {
  it('pins the exact handled event set (lockstep with the API router)', () => {
    // Mirrors HANDLED_STRIPE_EVENTS in apps/api/src/routes/stripe-webhooks.ts,
    // which pins the same literals in its own suite — drift fails one side.
    expect([...WEBHOOK_ENABLED_EVENTS]).toEqual([
      'checkout.session.completed',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'payment_intent.payment_failed',
      'customer.updated',
      'payment_method.attached',
    ])
  })
})

describe('parseWebhooksUrl', () => {
  it('returns null when the flag is absent', () => {
    expect(parseWebhooksUrl(['--mode', 'test'])).toBeNull()
  })

  it('parses space and equals forms', () => {
    expect(
      parseWebhooksUrl([
        '--webhooks',
        'https://api.example.com/v1/webhooks/stripe',
      ]),
    ).toBe('https://api.example.com/v1/webhooks/stripe')
    expect(
      parseWebhooksUrl([
        '--webhooks=https://api.example.com/v1/webhooks/stripe',
      ]),
    ).toBe('https://api.example.com/v1/webhooks/stripe')
  })

  it('throws when the flag has no URL', () => {
    expect(() => parseWebhooksUrl(['--webhooks'])).toThrow(/URL/)
    expect(() => parseWebhooksUrl(['--webhooks', '--commit'])).toThrow(/URL/)
  })

  it('throws on a non-https URL', () => {
    expect(() =>
      parseWebhooksUrl(['--webhooks', 'http://api.example.com/hook']),
    ).toThrow(/https/)
    expect(() => parseWebhooksUrl(['--webhooks', 'not-a-url'])).toThrow(
      /valid URL/,
    )
  })
})

describe('runWebhookProvision', () => {
  const HOOK_URL = 'https://api.example.com/v1/webhooks/stripe'

  const unusedPricesAndProducts: Pick<
    ProvisionStripeClient,
    'prices' | 'products'
  > = {
    prices: {
      list: async () => {
        throw new Error('prices.list not used in this test')
      },
      create: async () => {
        throw new Error('prices.create not used in this test')
      },
    },
    products: {
      create: async () => {
        throw new Error('products.create not used in this test')
      },
    },
  }

  it('no-ops when the endpoint URL is already registered', async () => {
    let createCalls = 0
    const stripeStub: ProvisionStripeClient = {
      ...unusedPricesAndProducts,
      webhookEndpoints: {
        list: async () => ({
          data: [
            {
              id: 'we_existing',
              url: HOOK_URL,
              enabled_events: [...WEBHOOK_ENABLED_EVENTS],
            },
          ],
          has_more: false,
        }),
        create: async () => {
          createCalls += 1
          throw new Error('should not create an already-registered endpoint')
        },
      },
    }

    const summary = await runWebhookProvision(
      { mode: 'test', commit: true, url: HOOK_URL },
      stripeStub,
    )
    expect(summary.action).toBe('noop')
    expect(summary.endpointId).toBe('we_existing')
    expect(summary.eventsInSync).toBe(true)
    expect(createCalls).toBe(0)
  })

  it('flags enabled_events drift on an existing endpoint without mutating it', async () => {
    const stripeStub: ProvisionStripeClient = {
      ...unusedPricesAndProducts,
      webhookEndpoints: {
        list: async () => ({
          data: [
            {
              id: 'we_drifted',
              url: HOOK_URL,
              enabled_events: ['invoice.payment_succeeded'],
            },
          ],
          has_more: false,
        }),
        create: async () => {
          throw new Error('should not create/mutate a drifted endpoint')
        },
      },
    }

    const summary = await runWebhookProvision(
      { mode: 'test', commit: true, url: HOOK_URL },
      stripeStub,
    )
    expect(summary.action).toBe('noop')
    expect(summary.eventsInSync).toBe(false)
  })

  it('dry-run reports would_create without calling create', async () => {
    let createCalls = 0
    const stripeStub: ProvisionStripeClient = {
      ...unusedPricesAndProducts,
      webhookEndpoints: {
        list: async () => ({ data: [], has_more: false }),
        create: async () => {
          createCalls += 1
          return { id: 'we_new', secret: 'whsec_x' }
        },
      },
    }

    const summary = await runWebhookProvision(
      { mode: 'test', commit: false, url: HOOK_URL },
      stripeStub,
    )
    expect(summary.action).toBe('would_create')
    expect(createCalls).toBe(0)
  })

  it('creates the endpoint with exactly the handled event set on --commit', async () => {
    const createdParams: {
      url: string
      enabled_events: string[]
      description: string
    }[] = []
    const stripeStub: ProvisionStripeClient = {
      ...unusedPricesAndProducts,
      webhookEndpoints: {
        list: async () => ({ data: [], has_more: false }),
        create: async (params) => {
          createdParams.push(params)
          return { id: 'we_new', secret: 'whsec_new_secret' }
        },
      },
    }

    const summary = await runWebhookProvision(
      { mode: 'test', commit: true, url: HOOK_URL },
      stripeStub,
    )
    expect(summary.action).toBe('created')
    expect(summary.endpointId).toBe('we_new')
    expect(createdParams).toHaveLength(1)
    expect(createdParams[0]?.url).toBe(HOOK_URL)
    expect(createdParams[0]?.enabled_events).toEqual([
      ...WEBHOOK_ENABLED_EVENTS,
    ])
  })

  it('finds a matching endpoint beyond the first page (paginates, no duplicate create)', async () => {
    const pageOne = Array.from({ length: 100 }, (_, idx) => ({
      id: `we_other_${idx}`,
      url: `https://other.example.com/hook-${idx}`,
      enabled_events: [...WEBHOOK_ENABLED_EVENTS],
    }))
    const listCalls: { limit: number; starting_after?: string }[] = []
    let createCalls = 0
    const stripeStub: ProvisionStripeClient = {
      ...unusedPricesAndProducts,
      webhookEndpoints: {
        list: async (params) => {
          listCalls.push(params)
          if (params.starting_after === undefined) {
            return { data: pageOne, has_more: true }
          }
          return {
            data: [
              {
                id: 'we_page_two',
                url: HOOK_URL,
                enabled_events: [...WEBHOOK_ENABLED_EVENTS],
              },
            ],
            has_more: false,
          }
        },
        create: async () => {
          createCalls += 1
          throw new Error('should not create a duplicate for a page-2 match')
        },
      },
    }

    const summary = await runWebhookProvision(
      { mode: 'test', commit: true, url: HOOK_URL },
      stripeStub,
    )
    expect(summary.action).toBe('noop')
    expect(summary.endpointId).toBe('we_page_two')
    expect(createCalls).toBe(0)
    expect(listCalls).toHaveLength(2)
    expect(listCalls[1]?.starting_after).toBe('we_other_99')
  })
})
