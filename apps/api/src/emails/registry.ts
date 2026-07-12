// apps/api/src/emails/registry.ts
//
// Typed template registry (eng infra spec Part 2 §4.2). PR 5.2 registers the
// four lifecycle templates; the remaining modules land in PR 5.3. The send
// pipeline treats an unregistered key as log-and-skip WITHOUT consuming the
// dedupe key, so real sends happen once templates land.

import type { EmailTemplateKey } from '@concert-crawl/db'
import { renderCancellationAck } from './templates/cancellation-ack.js'
import { renderRenewalReceiptMonthly } from './templates/renewal-receipt-monthly.js'
import { renderWelcomeGifted } from './templates/welcome-gifted.js'
import { renderWelcomePaid } from './templates/welcome-paid.js'
import type { EmailTemplateVars, TemplateRenderer } from './types.js'

const templateRegistry: {
  [K in EmailTemplateKey]?: TemplateRenderer<EmailTemplateVars[K]>
} = {
  welcome_paid: renderWelcomePaid,
  welcome_gifted: renderWelcomeGifted,
  renewal_receipt_monthly: renderRenewalReceiptMonthly,
  cancellation_ack: renderCancellationAck,
}

export const getTemplateRenderer = <K extends EmailTemplateKey>(
  templateKey: K,
): TemplateRenderer<EmailTemplateVars[K]> | null =>
  templateRegistry[templateKey] ?? null
