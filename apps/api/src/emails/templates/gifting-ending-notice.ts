// gifting_ending_notice — the gift lapses in ~a week (#783 brand pass). Warm
// wrap-up, not a hard sell: names the gifter (sanitized + fallback), an accent
// gratitude line, a "when it ends" rundown, and an accent callout to keep it
// going. This is the second and LAST gift email — no periodic check-ins.
// Product footer with NO manage link (comped — no billing relationship yet).

import {
  button,
  callout,
  featureList,
  footerRow,
  headerRow,
  ledeRow,
  monoEyebrow,
  row,
} from '../atoms.js'
import {
  EMAIL_FONT,
  EMAIL_MONO,
  ME,
  planUrl,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { formatEmailDate, sanitizeInlineText } from './format.js'
import { GIFT_KEEP_FEATURES } from './unlocks.js'

const SUBJECT = 'Your gifted Premium is wrapping up.'
const PREHEADER =
  "About a week left. Nothing gets deleted. Here's what happens next."
const GIFTER_FALLBACK = 'A friend of the crawl'
const CONTENT_PAD = '18px 26px 0'
const CHANGES_BODY_TEXT =
  "History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free, same as always. Everything you're watching stays put."

export const renderGiftingEndingNotice: TemplateRenderer<
  EmailTemplateVars['gifting_ending_notice']
> = ({ gifterName, giftEndsAt, unsubscribeUrl }) => {
  const sanitizedGifter =
    gifterName === null ? '' : sanitizeInlineText(gifterName)
  const gifterLabel = sanitizedGifter === '' ? GIFTER_FALLBACK : sanitizedGifter
  const giftEndDate = formatEmailDate(giftEndsAt)
  const endsPhrase =
    giftEndDate === null ? 'in about a week' : `on ${giftEndDate}`

  const sub = `${gifterLabel} put you on Premium. Your account slides back to Free ${endsPhrase}. No charge, no surprise.`

  const italicLine = `<div style="font-family: ${EMAIL_MONO}; font-style: italic; font-size: 12.5px; color: ${ME.accent}; letter-spacing: 0.02em;">Hope it showed you a few good nights.</div>`

  const changesBody = `${monoEyebrow({ text: 'When it ends', color: ME.subtle, marginBottom: 10 })}
<div style="font-family: ${EMAIL_FONT}; font-size: 13.5px; color: ${ME.muted}; line-height: 1.55;">History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free, same as always. <span style="color: ${ME.fg}; font-weight: 700;">Everything you're watching stays put.</span></div>`

  const calloutInner =
    monoEyebrow({
      text: 'Want to keep it going?',
      color: ME.accent,
      marginBottom: 12,
    }) + featureList({ items: GIFT_KEEP_FEATURES, accent: ME.accent })

  const microcopy = `<div style="font-family: ${EMAIL_MONO}; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${ME.subtle};">No card on file · nothing gets deleted · only if you want to</div>`

  const bodyRows = [
    headerRow('Gifted Premium · ending'),
    ledeRow({
      title: "It's been a good run.",
      sub,
      titleSize: 27,
    }),
    row('14px 26px 0', italicLine),
    row(CONTENT_PAD, changesBody),
    row(
      CONTENT_PAD,
      callout({ inner: calloutInner, accent: ME.accent, soft: ME.accentSoft }),
    ),
    row(
      '20px 26px 6px',
      button({
        label: 'Keep Premium for $5/mo',
        tone: 'signal',
        href: planUrl(),
      }),
    ),
    row('10px 26px 4px', microcopy),
    footerRow({
      family: 'product',
      showManage: false,
      ...(unsubscribeUrl === null ? {} : { unsubscribeUrl }),
    }),
  ].join('\n')

  const text = [
    "It's been a good run.",
    '',
    sub,
    '',
    'Hope it showed you a few good nights.',
    '',
    'When it ends',
    CHANGES_BODY_TEXT,
    '',
    'Want to keep it going?',
    ...GIFT_KEEP_FEATURES.map(
      (item) => `  - ${typeof item === 'string' ? item : item.text}`,
    ),
    '',
    'No card on file · nothing gets deleted · only if you want to',
    '',
    `Keep Premium for $5/mo: ${planUrl()}`,
  ].join('\n')

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyRows }),
    text: renderTextShell({
      body: text,
      family: 'product',
      showManage: false,
      ...(unsubscribeUrl === null ? {} : { unsubscribeUrl }),
    }),
  }
}
