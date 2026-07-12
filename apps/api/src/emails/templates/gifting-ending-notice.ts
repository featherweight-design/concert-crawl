// gifting_ending_notice — the gift lapses in ~7 days (GE-*). Voice: casual +
// warm (GE-3). Names the gifter (GE-5, sanitized + fallback like welcome_gifted)
// and the end date (GE-6). This is the second and LAST gift email (GE-8) — no
// periodic check-ins. CTA → plan page to convert to paid (GE-7). All
// interpolated user strings are escaped and single-lined.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_ACCENT_PREMIUM, EMAIL_TEXT_MUTED } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { formatEmailDate, planPageUrl, sanitizeInlineText } from './format.js'

const SUBJECT = 'Your gifted Premium is wrapping up soon'
const PREHEADER =
  'It slides back to Free when the gift ends — add a card to keep the extras going.'

const GIFTER_FALLBACK = 'a friend of the crawl'
const HEADING = 'Your gifted Premium is wrapping up'

export const renderGiftingEndingNotice: TemplateRenderer<
  EmailTemplateVars['gifting_ending_notice']
> = ({ gifterName, giftEndsAt }) => {
  const sanitizedGifter =
    gifterName === null ? '' : sanitizeInlineText(gifterName)
  const gifterLabel = sanitizedGifter === '' ? GIFTER_FALLBACK : sanitizedGifter
  const giftEndDate = formatEmailDate(giftEndsAt)

  const introSentence =
    giftEndDate === null
      ? `The Premium ${gifterLabel} gifted you is wrapping up in about a week.`
      : `The Premium ${gifterLabel} gifted you wraps up on ${giftEndDate} — about a week from now.`
  const wrapSentence =
    'When it ends, your account slides back to Free — nothing gets deleted, you just lose the Premium extras until you pick a plan.'

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_ACCENT_PREMIUM};">${escapeHtml(HEADING)}</h1>
<p style="margin: 0 0 16px;">${escapeHtml(introSentence)}</p>
<p style="margin: 0 0 16px;">${escapeHtml(wrapSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};"><a href="${escapeHtml(planPageUrl())}" style="color: ${EMAIL_ACCENT_PREMIUM};">Pick a plan to keep Premium</a> — no pressure, it'll be there when you want it.</p>`

  const textLines = [
    HEADING,
    '',
    introSentence,
    '',
    wrapSentence,
    '',
    `Pick a plan to keep Premium: ${planPageUrl()}`,
  ]

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
