// card_expiring_soon — heads-up that the card on file is about to expire (#783
// brand pass). ONE template, three trigger windows (30/14/7 days — the billing
// job dedupes within the 7-day band, so "in 1 day" is a copy variant, not a
// separate window); the phrase flexes on {daysRemaining}, singular at 1. This
// is a heads-up, not a failure, so it stays tier-accented — never amber. Tier
// badge renders when we know the tier. The card chip renders the real card on
// file when the trigger resolved it from Stripe, and is omitted otherwise.

import {
  button,
  cardChip,
  footerRow,
  headerRow,
  ledeRow,
  row,
  statusEyebrow,
  tierBadge,
} from '../atoms.js'
import {
  EMAIL_MONO,
  ME,
  planUrl,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import { TIER_ACCENT, TIER_META } from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'

const SUBJECT = "Heads up. Your card's about to expire."
const PREHEADER = 'Update it before your next renewal. Takes about 30 seconds.'
const FOOTER_NOTE = "Already updated it? You're set. Ignore this one."

const CONTENT_PAD = '18px 26px 0'

// "in 1 day" reads better than "in 1 days" — flex the noun on the count.
const daysPhrase = (days: number): string =>
  days === 1 ? 'in 1 day' : `in ${days} days`

type CardMeta = NonNullable<EmailTemplateVars['card_expiring_soon']['card']>

// "visa" → "Visa"; leaves multi-word brands ("american express") title-cased.
const formatBrand = (brand: string): string =>
  brand.replace(/\b\w/g, (chr) => chr.toUpperCase())

// Stripe gives a 4-digit year + 1-based month; render "exp MM/YY".
const formatExp = (card: CardMeta): string =>
  `exp ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`

export const renderCardExpiringSoon: TemplateRenderer<
  EmailTemplateVars['card_expiring_soon']
> = ({ tierName, daysRemaining, tier, card }) => {
  const accent = tier === undefined ? ME.signal : TIER_ACCENT[tier]
  const planPhrase =
    tierName ?? (tier === undefined ? 'your plan' : TIER_META[tier].label)

  const title = `Your card expires ${daysPhrase(daysRemaining)}.`
  const sub = `The card on file runs out before your next ${planPhrase} renewal. Drop in a fresh one and nothing skips a beat.`

  const microcopy = `<div style="font-family: ${EMAIL_MONO}; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${ME.subtle};">Nothing's wrong yet · this is just a nudge</div>`

  const cardLabel =
    card === null || card === undefined
      ? null
      : `${formatBrand(card.brand)} ·· ${card.last4}`

  const bodyRows = [
    headerRow('Billing'),
    row(
      '22px 26px 0',
      statusEyebrow({ text: 'Billing · heads up', color: accent }),
    ),
    ledeRow({ title, sub, titleSize: 26 }),
    ...(tier === undefined ? [] : [row(CONTENT_PAD, tierBadge({ tier }))]),
    ...(cardLabel === null || card === null || card === undefined
      ? []
      : [row(CONTENT_PAD, cardChip(cardLabel, formatExp(card)))]),
    row(
      '20px 26px 6px',
      button({ label: 'Update your card', tone: 'signal', href: planUrl() }),
    ),
    row('10px 26px 4px', microcopy),
    footerRow({ family: 'billing', showManage: true, note: FOOTER_NOTE }),
  ].join('\n')

  const text = [
    title,
    '',
    sub,
    '',
    ...(cardLabel === null || card === null || card === undefined
      ? []
      : [`Card on file: ${cardLabel} · ${formatExp(card)}`, '']),
    "Nothing's wrong yet · this is just a nudge",
    '',
    `Update your card: ${planUrl()}`,
  ].join('\n')

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyRows }),
    text: renderTextShell({ body: text, family: 'billing', showManage: true }),
  }
}
