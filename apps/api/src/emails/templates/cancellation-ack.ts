// cancellation_ack — warm + gracious, and deliberately NOT a sales surface
// (#783 locked decision: no win-back pitch, no discount hook). Confirms
// access through the period end and the 90-day data-retention window.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_ACCENT_PREMIUM, EMAIL_TEXT_MUTED } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { formatEmailDate } from './format.js'

const SUBJECT = 'Your cancellation is confirmed — no hard feelings'
const PREHEADER =
  'Your access runs until the end of the period, and your data waits 90 days for you.'

export const renderCancellationAck: TemplateRenderer<
  EmailTemplateVars['cancellation_ack']
> = ({ tierName, accessEndsAt }) => {
  const accessEndDate = formatEmailDate(accessEndsAt)
  const planLabel = tierName ?? 'plan'

  const accessSentence =
    accessEndDate === null
      ? `Your ${planLabel} access continues until the end of your current billing period — nothing changes before then.`
      : `Your ${planLabel} access continues until ${accessEndDate} — nothing changes before then.`
  const retentionSentence = `After that, your ${planLabel} data sticks around for 90 days in case you come back. If you do, it'll be right where you left it.`

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_ACCENT_PREMIUM};">All set — cancellation confirmed</h1>
<p style="margin: 0 0 16px;">${escapeHtml(accessSentence)}</p>
<p style="margin: 0 0 16px;">${escapeHtml(retentionSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};">Thanks for supporting the crawl while you did. The free calendar is yours forever — that's the whole point.</p>`

  const textLines = [
    'All set — cancellation confirmed',
    '',
    accessSentence,
    '',
    retentionSentence,
    '',
    "Thanks for supporting the crawl while you did. The free calendar is yours forever — that's the whole point.",
  ]

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
