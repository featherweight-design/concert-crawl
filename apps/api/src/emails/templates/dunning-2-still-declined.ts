// dunning_2_still_declined — Day 3–4, retry failed (D2-*). Same shape as
// dunning_1, escalated: tone stage "we're still trying" (G20). Carries the
// locked phrase "Heads up — we're still trying to get this through." (D2-5).
// Still honest, no shame/false urgency, never "fraud" (G19). Amber heading,
// CTA → Stripe portal (D2-6 tier var, portal CTA inherited from D1-6).

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_TEXT_MUTED, EMAIL_WARNING_AMBER } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'

const SUBJECT = "Still can't reach your card — mind a quick look?"
const PREHEADER =
  "We're still trying to get your renewal through. A fresh card sorts it in a minute."

const HEADING = "We're still trying to get this through"

export const renderDunning2StillDeclined: TemplateRenderer<
  EmailTemplateVars['dunning_2_still_declined']
> = ({ tierName, portalUrl }) => {
  const planLabel = tierName ?? 'your plan'

  const introSentence = `Heads up — we're still trying to get this through. The card on file for ${planLabel} keeps coming back declined.`
  const nudgeSentence =
    "There's still time in your 7-day window, but a fresh card now takes the guesswork out of it."

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_WARNING_AMBER};">${escapeHtml(HEADING)}</h1>
<p style="margin: 0 0 16px;">${escapeHtml(introSentence)}</p>
<p style="margin: 0 0 16px;">${escapeHtml(nudgeSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};"><a href="${escapeHtml(portalUrl)}" style="color: ${EMAIL_WARNING_AMBER};">Update your card</a> — that's all it takes.</p>`

  const textLines = [
    HEADING,
    '',
    introSentence,
    '',
    nudgeSentence,
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
