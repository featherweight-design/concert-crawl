// dunning_3_final_warning — Day 7, final retry failed (D3-*). Voice: honest +
// direct, tone stage "pauses tomorrow" (G20). Carries the locked copy shape
// "Your card hasn't cleared — {tierName} pauses tomorrow if we can't get a
// fresh one." (D3-4). No false urgency, no shame (D3-5), never "fraud" (G19).
// The "pauses tomorrow" reality matches the next-day cancellation (D3-7).
// Amber heading, CTA → Stripe portal.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_TEXT_MUTED, EMAIL_WARNING_AMBER } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'

const SUBJECT = 'Last chance — your plan pauses tomorrow'
const PREHEADER =
  "One more try and your card still hasn't cleared. A fresh one keeps you going."

const HEADING = "Your card hasn't cleared"

export const renderDunning3FinalWarning: TemplateRenderer<
  EmailTemplateVars['dunning_3_final_warning']
> = ({ tierName, portalUrl }) => {
  const planLabel = tierName ?? 'your plan'

  const introSentence = `Your card hasn't cleared — ${planLabel} pauses tomorrow if we can't get a fresh one.`
  const reassureSentence =
    'Nothing gets deleted. You slide back to Free, and everything you unlocked comes right back the moment a working card goes on.'

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_WARNING_AMBER};">${escapeHtml(HEADING)}</h1>
<p style="margin: 0 0 16px;">${escapeHtml(introSentence)}</p>
<p style="margin: 0 0 16px;">${escapeHtml(reassureSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};"><a href="${escapeHtml(portalUrl)}" style="color: ${EMAIL_WARNING_AMBER};">Update your card</a> to keep things running.</p>`

  const textLines = [
    HEADING,
    '',
    introSentence,
    '',
    reassureSentence,
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
