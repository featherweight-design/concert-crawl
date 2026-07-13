// Dev-only email preview + test-send harness.
//
// The 10 transactional lifecycle templates (registry.ts) render to HTML from
// TypeScript — there's no route that renders them for a human. This script
// renders every template with representative sample vars so you can review the
// real output, and can test-send any one of them through Resend.
//
// Review all templates in a browser (writes HTML to apps/api/.email-preview/):
//   pnpm --filter @concert-crawl/api email:preview
//
// Test-send one template to yourself (needs RESEND_API_KEY in the shell):
//   RESEND_API_KEY=re_... pnpm --filter @concert-crawl/api email:preview -- \
//     --send you@example.com --only welcome_paid
//
// Omit --only with --send to send the whole set. This is a dev tool: it is not
// imported by the app and never runs in prod.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resend } from 'resend'
import type { EmailTemplateKey } from '@concert-crawl/db'
import { getTemplateRenderer } from './registry.js'
import type { EmailTemplateVars, RenderedEmail } from './types.js'

const FROM = 'Concert Crawl <billing@concertcrawl.app>'
const REPLY_TO = 'support@concertcrawl.app'
// Anchor output to the api package dir (../../ from src/emails or dist/emails),
// not process.cwd(), so previews always land in apps/api/.email-preview/ —
// which is what .gitignore covers — regardless of where the script is run from.
const OUTPUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../.email-preview',
)
const PORTAL_URL = 'https://billing.stripe.com/p/session/test_preview'

// One representative vars set per template — based on the fixtures in
// src/emails/templates/templates.test.ts so the preview closely tracks what the
// suite asserts (a few values differ, e.g. welcome_gifted uses a non-null
// giftEndsAt here).
// Exhaustive (non-optional) by design: adding a new EmailTemplateKey breaks
// this at compile time until its sample vars are supplied here, so the harness
// can never silently drop a template.
const sampleVars: { [K in EmailTemplateKey]: EmailTemplateVars[K] } = {
  welcome_paid: { tier: 'founder', founderSeatNumber: 7 },
  welcome_gifted: { gifterName: 'Sam', giftEndsAt: '2026-12-01T12:00:00Z' },
  renewal_receipt_monthly: {
    periodLabel: 'June 2026',
    amount: '$5.00',
    tierName: 'Premium (monthly)',
    periodEnd: '2026-07-15T12:00:00Z',
    chargeDate: '2026-06-15T12:00:00Z',
    customerId: 'cus_preview123',
    stripeReceiptUrl: 'https://pay.stripe.com/receipts/preview123',
  },
  cancellation_ack: {
    tierName: 'Premium',
    accessEndsAt: '2026-07-15T12:00:00Z',
  },
  dunning_1_card_declined: { tierName: 'Premium', portalUrl: PORTAL_URL },
  dunning_2_still_declined: { tierName: 'Premium', portalUrl: PORTAL_URL },
  dunning_3_final_warning: { tierName: 'Premium', portalUrl: PORTAL_URL },
  card_expiring_soon: { tierName: 'Premium', daysRemaining: 30 },
  gifting_ending_notice: {
    gifterName: 'Sam',
    giftEndsAt: '2026-12-01T12:00:00Z',
  },
  winback: { tierName: 'Premium' },
}

// Reads the value after a flag, failing fast if it's missing or is itself
// another flag — otherwise `--send --only x` would silently send to nobody and
// `--only` at the end would silently fall back to the whole set.
const readFlagValue = (argv: string[], idx: number, flag: string): string => {
  const value = argv[idx + 1]
  if (value === undefined || value.startsWith('--')) {
    process.stderr.write(`${flag} requires a value.\n`)
    process.exit(1)
  }
  return value
}

const parseArgs = (
  argv: string[],
): { sendTo: string | null; only: string | null } => {
  let sendTo: string | null = null
  let only: string | null = null
  for (let idx = 0; idx < argv.length; idx += 1) {
    if (argv[idx] === '--send') sendTo = readFlagValue(argv, idx, '--send')
    if (argv[idx] === '--only') only = readFlagValue(argv, idx, '--only')
  }
  return { sendTo, only }
}

// Minimal HTML-entity escape for values interpolated into the index page —
// subjects can contain &, <, >, or quotes and would otherwise break the markup.
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderOne = <K extends EmailTemplateKey>(
  templateKey: K,
): RenderedEmail | null => {
  const renderer = getTemplateRenderer(templateKey)
  if (renderer === null) return null
  return renderer(sampleVars[templateKey])
}

const writePreviews = (keys: EmailTemplateKey[]): void => {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const indexRows: string[] = []
  for (const templateKey of keys) {
    const rendered = renderOne(templateKey)
    if (rendered === null) {
      process.stderr.write(
        `No renderer registered for ${templateKey} in registry.ts — skipped.\n`,
      )
      process.exitCode = 1
      continue
    }
    const fileName = `${templateKey}.html`
    writeFileSync(join(OUTPUT_DIR, fileName), rendered.html, 'utf8')
    indexRows.push(
      `<li><a href="./${encodeURIComponent(fileName)}">${escapeHtml(templateKey)}</a> — <em>${escapeHtml(rendered.subject)}</em></li>`,
    )
  }
  writeFileSync(
    join(OUTPUT_DIR, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Email previews</title><h1>Concert Crawl — email previews</h1><ul>${indexRows.join('')}</ul>`,
    'utf8',
  )
  process.stdout.write(
    `Rendered ${indexRows.length} templates → ${OUTPUT_DIR}\nOpen ${join(OUTPUT_DIR, 'index.html')} in a browser.\n`,
  )
}

const sendPreviews = async (
  keys: EmailTemplateKey[],
  sendTo: string,
): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    process.stderr.write('RESEND_API_KEY not set — cannot test-send.\n')
    process.exitCode = 1
    return
  }
  const resend = new Resend(apiKey)
  for (const templateKey of keys) {
    const rendered = renderOne(templateKey)
    if (rendered === null) {
      process.stderr.write(
        `No renderer registered for ${templateKey} in registry.ts — skipped.\n`,
      )
      process.exitCode = 1
      continue
    }
    try {
      const response = await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: sendTo,
        subject: `[preview] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
      })
      if (response.error) {
        process.stderr.write(
          `${templateKey}: Resend rejected — ${JSON.stringify(response.error)}\n`,
        )
        process.exitCode = 1
        continue
      }
      process.stdout.write(`${templateKey}: sent → ${sendTo}\n`)
    } catch (err) {
      process.stderr.write(`${templateKey}: send threw — ${String(err)}\n`)
      process.exitCode = 1
    }
  }
}

const main = async (): Promise<void> => {
  const { sendTo, only } = parseArgs(process.argv.slice(2))
  const allKeys = Object.keys(sampleVars) as EmailTemplateKey[]
  const keys =
    only === null
      ? allKeys
      : allKeys.filter((templateKey) => templateKey === only)
  if (keys.length === 0) {
    process.stderr.write(
      `Unknown --only template "${only}". Known: ${allKeys.join(', ')}\n`,
    )
    process.exitCode = 1
    return
  }
  if (sendTo !== null) {
    await sendPreviews(keys, sendTo)
  } else {
    writePreviews(keys)
  }
}

void main()
