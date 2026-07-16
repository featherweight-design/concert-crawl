// apps/api/src/emails/registry.ts
//
// Typed template registry (eng infra spec Part 2 §4.2). PR 5.2 registered the
// four lifecycle templates; PR 5.3 lands the dunning trio, the card-expiry
// reminder, the gifting-ending notice, and win-back — completing the set. The
// send pipeline treats an unregistered key as log-and-skip WITHOUT consuming
// the dedupe key, so real sends happen once templates land.

import type { EmailTemplateKey } from '@concert-crawl/db'
import { renderCancellationAck } from './templates/cancellation-ack.js'
import { renderCardExpiringSoon } from './templates/card-expiring-soon.js'
import { renderDunning1CardDeclined } from './templates/dunning-1-card-declined.js'
import { renderDunning2StillDeclined } from './templates/dunning-2-still-declined.js'
import { renderDunning3FinalWarning } from './templates/dunning-3-final-warning.js'
import { renderGiftingEndingNotice } from './templates/gifting-ending-notice.js'
import { renderRenewalReceiptAnnual } from './templates/renewal-receipt-annual.js'
import { renderRenewalReceiptMonthly } from './templates/renewal-receipt-monthly.js'
import { renderWelcomeGifted } from './templates/welcome-gifted.js'
import { renderWelcomePaid } from './templates/welcome-paid.js'
import { renderWinback } from './templates/winback.js'
import type { EmailTemplateVars, TemplateRenderer } from './types.js'

const templateRegistry: {
  [K in EmailTemplateKey]?: TemplateRenderer<EmailTemplateVars[K]>
} = {
  welcome_paid: renderWelcomePaid,
  welcome_gifted: renderWelcomeGifted,
  renewal_receipt_monthly: renderRenewalReceiptMonthly,
  renewal_receipt_annual: renderRenewalReceiptAnnual,
  cancellation_ack: renderCancellationAck,
  dunning_1_card_declined: renderDunning1CardDeclined,
  dunning_2_still_declined: renderDunning2StillDeclined,
  dunning_3_final_warning: renderDunning3FinalWarning,
  card_expiring_soon: renderCardExpiringSoon,
  gifting_ending_notice: renderGiftingEndingNotice,
  winback: renderWinback,
}

export const getTemplateRenderer = <K extends EmailTemplateKey>(
  templateKey: K,
): TemplateRenderer<EmailTemplateVars[K]> | null =>
  templateRegistry[templateKey] ?? null
