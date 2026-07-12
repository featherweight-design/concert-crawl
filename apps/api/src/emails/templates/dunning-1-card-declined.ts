// dunning_1_card_declined — Day 0, first failed renewal (D1-*). Voice: casual
// + helpful, tone stage "give it a refresh?" (G20). Honest, never blamey (D1-4,
// G19: no shame, no false urgency, never "fraud"). References the 7-day window
// (D1-7) and points at the Stripe billing portal (D1-6). Amber heading (G13).

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_TEXT_MUTED, EMAIL_WARNING_AMBER } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'

const SUBJECT = 'Your card got declined — give it a refresh?'
const PREHEADER =
  "No stress — you've got 7 days to update it before anything changes on your plan."

const HEADING = 'Your card got declined'

export const renderDunning1CardDeclined: TemplateRenderer<
  EmailTemplateVars['dunning_1_card_declined']
> = ({ tierName, portalUrl }) => {
  const planLabel = tierName ?? 'your plan'

  const introSentence = `Your renewal for ${planLabel} didn't go through — the card on file got declined. Happens all the time; nothing's wrong on your end.`
  const windowSentence =
    "You've got 7 days to update your card before anything changes. Give it a refresh and we'll take it from there."

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_WARNING_AMBER};">${escapeHtml(HEADING)}</h1>
<p style="margin: 0 0 16px;">${escapeHtml(introSentence)}</p>
<p style="margin: 0 0 16px;">${escapeHtml(windowSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};"><a href="${escapeHtml(portalUrl)}" style="color: ${EMAIL_WARNING_AMBER};">Update your card</a> — takes about a minute.</p>`

  const textLines = [
    HEADING,
    '',
    introSentence,
    '',
    windowSentence,
    '',
    `Update your card: ${portalUrl}`,
  ]

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
