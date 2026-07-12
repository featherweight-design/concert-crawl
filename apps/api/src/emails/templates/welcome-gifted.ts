// welcome_gifted — lifetime-ish Premium comp (#781). Names the gifter, states
// the end date when we have one, and sets expectations for the wrap-up moment
// with a soft add-a-card CTA. Never a hard sell.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import { EMAIL_ACCENT_PREMIUM, EMAIL_TEXT_MUTED } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { formatEmailDate, planPageUrl } from './format.js'

const SUBJECT = "Someone gifted you Premium — it's live"
const PREHEADER =
  'Every Premium unlock is yours — concert history, calendar export, alerts, the lot.'

const PREMIUM_UNLOCKS = [
  'Concert history — shows you attended',
  'Calendar export — Apple + Google',
  'Follow artists + new-show alerts',
  'Price-drop alerts + Spotify sync',
]

const GIFTER_FALLBACK = 'a friend of the crawl'

export const renderWelcomeGifted: TemplateRenderer<
  EmailTemplateVars['welcome_gifted']
> = ({ gifterName, giftEndsAt }) => {
  const gifterLabel = gifterName ?? GIFTER_FALLBACK
  const giftEndDate = formatEmailDate(giftEndsAt)

  const dateSentence =
    giftEndDate === null ? null : `Your gift runs through ${giftEndDate}.`
  const wrapSentence =
    'When it wraps, your account slides back to Free — nothing gets deleted, you just lose the Premium extras until you pick a plan.'

  const unlockItemsHtml = PREMIUM_UNLOCKS.map(
    (unlock) => `<li style="margin: 0 0 8px;">${escapeHtml(unlock)}</li>`,
  ).join('\n')

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_ACCENT_PREMIUM};">You've got Premium, from ${escapeHtml(gifterLabel)}</h1>
<p style="margin: 0 0 16px;">Someone likes you. Every Premium unlock is live on your account right now:</p>
<ul style="margin: 0 0 16px; padding-left: 20px;">
${unlockItemsHtml}
</ul>
<p style="margin: 0 0 16px;">${dateSentence === null ? '' : `${escapeHtml(dateSentence)} `}${escapeHtml(wrapSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};"><a href="${escapeHtml(planPageUrl())}" style="color: ${EMAIL_ACCENT_PREMIUM};">Add a card for when this wraps</a> — no pressure, it'll be right there when you want it.</p>`

  const textLines = [
    `You've got Premium, from ${gifterLabel}`,
    '',
    'Someone likes you. Every Premium unlock is live on your account right now:',
    '',
    ...PREMIUM_UNLOCKS.map((unlock) => `- ${unlock}`),
    '',
    ...(dateSentence === null ? [] : [dateSentence]),
    wrapSentence,
    '',
    `Add a card for when this wraps: ${planPageUrl()}`,
  ]

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
