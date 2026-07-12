// card_expiring_soon — heads-up that the card on file is about to expire (CE-*).
// ONE template, THREE trigger windows (30/14/7 days); the timeframe microcopy
// flexes on {daysRemaining} rather than per-window templates (CE-2, CE-3).
// Voice: casual + helpful (CE-5). This is a heads-up, not a failure, so the
// heading uses brand primary (not amber). CTA → plan page to update the card.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_BRAND_PRIMARY, EMAIL_TEXT_MUTED } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { planPageUrl } from './format.js'

const SUBJECT = 'Your card on file is about to expire'
const PREHEADER =
  'Swap it before it lapses and your plan keeps humming along without a hiccup.'

const HEADING = 'Your card is about to expire'

// "in 1 day" reads better than "in 1 days" — flex the noun on the count.
const daysPhrase = (daysRemaining: number): string =>
  daysRemaining === 1 ? 'in 1 day' : `in ${daysRemaining} days`

export const renderCardExpiringSoon: TemplateRenderer<
  EmailTemplateVars['card_expiring_soon']
> = ({ tierName, daysRemaining }) => {
  const planLabel = tierName ?? 'your plan'
  const timeframe = daysPhrase(daysRemaining)

  const introSentence = `The card we've got on file for ${planLabel} expires ${timeframe}. No action needed yet — just a friendly heads-up.`
  const nudgeSentence =
    'Pop a fresh card on before it lapses and your next renewal goes through without a blip.'

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_BRAND_PRIMARY};">${escapeHtml(HEADING)}</h1>
<p style="margin: 0 0 16px;">${escapeHtml(introSentence)}</p>
<p style="margin: 0 0 16px;">${escapeHtml(nudgeSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};"><a href="${escapeHtml(planPageUrl())}" style="color: ${EMAIL_BRAND_PRIMARY};">Update your card</a> — takes about a minute.</p>`

  const textLines = [
    HEADING,
    '',
    introSentence,
    '',
    nudgeSentence,
    '',
    `Update your card: ${planPageUrl()}`,
  ]

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
