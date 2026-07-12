// winback — day-60 post-cancel nudge (WB-*). Voice: casual + lightly nostalgic
// (WB-3). BASIC SHAPE ONLY: one hero copy block, one CTA (WB-4). NOT multi-stage
// (WB-6) and — critically — NO discount / percent-off / coupon of any kind
// (WB-8, G18): winback pricing matches the locked tier prices, no special
// offers. Kept light; no heavy "we miss you". Single CTA → plan page.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_BRAND_PRIMARY, EMAIL_TEXT_MUTED } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { planPageUrl } from './format.js'

const SUBJECT = 'The Denver calendar has been busy lately'
const PREHEADER =
  "Plenty of new shows on the board since you left. Your old plan's right where you left it."

const HEADING = 'Denver kept the shows coming'

export const renderWinback: TemplateRenderer<EmailTemplateVars['winback']> = ({
  tierName,
}) => {
  const planLabel = tierName ?? 'Premium'

  const heroSentence = `It's been a minute. The calendar's filled up since you left — new venues, new shows, the usual chaos. Whenever you want the ${planLabel} extras back, they're right where you left them.`

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_BRAND_PRIMARY};">${escapeHtml(HEADING)}</h1>
<p style="margin: 0 0 16px;">${escapeHtml(heroSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};"><a href="${escapeHtml(planPageUrl())}" style="color: ${EMAIL_BRAND_PRIMARY};">Take another look</a> — no pressure, same plan, same price.</p>`

  const textLines = [
    HEADING,
    '',
    heroSentence,
    '',
    `Take another look: ${planPageUrl()}`,
  ]

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
