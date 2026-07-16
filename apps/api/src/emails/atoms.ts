// apps/api/src/emails/atoms.ts
//
// String-HTML port of the design atom library
// (design/design_handoff_monetization_emails/email-primitives.jsx). Each atom
// returns an HTML fragment; row atoms return a full-width `<tr>` that drops
// into the 600px card table in renderEmailShell. Inline atoms return spans/
// divs a template composes inside a `row(...)`.
//
// Deviation from the JSX source (documented in the gap report): decorative
// inline SVGs (feature checkmarks, card chip, price-promise lock) are rendered
// as styled Unicode glyphs — Gmail and Outlook strip inline <svg>, so glyphs
// are the email-safe equivalent that survives every client.

import {
  EMAIL_FONT as FONT,
  EMAIL_MONO as MONO,
  LEGAL_LINE,
  ME,
  escapeHtml,
  notificationsUrl,
  planUrl,
} from './layout.js'
import {
  PRICE_PROMISE,
  TIER_ACCENT,
  TIER_META,
  type EmailTier,
} from './palette.js'

// ── generic row wrapper ──────────────────────────────────────
export const row = (pad: string, inner: string): string =>
  `<tr><td style="padding: ${pad};">${inner}</td></tr>`

// ── EmWordmark ───────────────────────────────────────────────
export const wordmark = (): string =>
  `<span style="font-family: ${FONT}; font-weight: 800; font-size: 17px; color: ${ME.fg}; letter-spacing: -0.02em;">concert <span style="color: ${ME.accent};">crawl.</span></span>`

// ── EmMonoEyebrow ────────────────────────────────────────────
interface MonoEyebrowInput {
  text: string
  color?: string
  size?: number
  marginBottom?: number
}

export const monoEyebrow = ({
  text,
  color = ME.subtle,
  size = 10,
  marginBottom = 0,
}: MonoEyebrowInput): string =>
  `<div style="font-family: ${MONO}; font-size: ${size}px; letter-spacing: 0.15em; color: ${color}; text-transform: uppercase; font-weight: 700;${marginBottom > 0 ? ` margin-bottom: ${marginBottom}px;` : ''}">${escapeHtml(text)}</div>`

// ── EmHeader ─────────────────────────────────────────────────
export const headerRow = (eyebrow?: string): string =>
  `<tr><td style="padding: 22px 26px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align: middle;">${wordmark()}</td>
${eyebrow === undefined ? '' : `<td style="text-align: right; vertical-align: middle; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.16em; color: ${ME.subtle}; text-transform: uppercase; font-weight: 700;">${escapeHtml(eyebrow)}</td>`}
</tr></table>
</td></tr>`

// ── EmLede ───────────────────────────────────────────────────
interface LedeInput {
  eyebrow?: string
  title: string
  sub?: string
  titleSize?: number
}

export const ledeRow = ({
  eyebrow,
  title,
  sub,
  titleSize = 26,
}: LedeInput): string =>
  `<tr><td style="padding: 24px 26px 4px;">
${eyebrow === undefined ? '' : monoEyebrow({ text: eyebrow, color: ME.subtle, marginBottom: 11 })}
<div style="font-family: ${FONT}; font-weight: 900; font-size: ${titleSize}px; color: ${ME.fg}; letter-spacing: -0.025em; line-height: 1.12;">${escapeHtml(title)}</div>
${sub === undefined ? '' : `<div style="font-family: ${FONT}; font-size: 14.5px; color: ${ME.muted}; line-height: 1.5; margin-top: 10px;">${escapeHtml(sub)}</div>`}
</td></tr>`

// ── EmButton ─────────────────────────────────────────────────
type ButtonTone = 'signal' | 'accent' | 'ghost'

const BUTTON_TONES: Record<
  ButtonTone,
  { bg: string; color: string; border: string }
> = {
  signal: { bg: ME.signal, color: ME.onSignal, border: 'transparent' },
  accent: { bg: ME.accent, color: ME.onAccent, border: 'transparent' },
  ghost: { bg: 'transparent', color: ME.fg, border: ME.border },
}

interface ButtonInput {
  label: string
  tone?: ButtonTone
  href: string
}

export const button = ({
  label,
  tone = 'signal',
  href,
}: ButtonInput): string => {
  const { bg, color, border } = BUTTON_TONES[tone]
  return `<a href="${escapeHtml(href)}" style="display: block; font-family: ${FONT}; font-weight: 800; font-size: 14.5px; text-decoration: none; text-align: center; padding: 14px; border-radius: 12px; letter-spacing: -0.01em; background: ${bg}; color: ${color}; border: 1px solid ${border};">${escapeHtml(label)}</a>`
}

// ── EmTierBadge ──────────────────────────────────────────────
interface TierBadgeInput {
  tier: EmailTier
  beta?: boolean
}

export const tierBadge = ({ tier, beta = false }: TierBadgeInput): string => {
  const accent = TIER_ACCENT[tier]
  const label = TIER_META[tier].label
  const background =
    tier === 'founder'
      ? 'linear-gradient(135deg, rgba(122,230,255,0.16), rgba(255,123,212,0.16))'
      : `${accent}22`
  const border = tier === 'founder' ? `${ME.signal}55` : `${accent}55`
  const pill = `<span style="display: inline-block; background: ${background}; border: 1px solid ${border}; border-radius: 6px; padding: 4px 9px; font-family: ${MONO}; font-weight: 700; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${accent};">${escapeHtml(label)}</span>`
  const betaPill = beta
    ? ` <span style="display: inline-block; background: ${ME.surf2}; border: 1px solid ${ME.border}; border-radius: 6px; padding: 4px 9px; font-family: ${MONO}; font-weight: 700; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${ME.muted};">Beta</span>`
    : ''
  return pill + betaPill
}

// ── EmFeatureList ────────────────────────────────────────────
export type FeatureItem = string | { text: string; future: boolean }

interface FeatureListInput {
  items: FeatureItem[]
  accent?: string
}

export const featureList = ({
  items,
  accent = ME.signal,
}: FeatureListInput): string => {
  const rows = items
    .map((item) => {
      const text = typeof item === 'string' ? item : item.text
      const future = typeof item === 'string' ? false : item.future
      const marker = future
        ? `<span style="font-family: ${MONO}; font-weight: 800; font-size: 12px; color: ${accent};">&#9733;</span>`
        : `<span style="font-weight: 800; font-size: 13px; color: ${accent};">&#10003;</span>`
      return `<tr>
<td style="padding: 5px 0; vertical-align: top; width: 20px;">${marker}</td>
<td style="padding: 5px 0; vertical-align: top; font-family: ${FONT}; font-size: 13.5px; font-weight: 500; color: ${ME.fg}; line-height: 1.4; opacity: ${future ? 0.62 : 1};">${escapeHtml(text)}</td>
</tr>`
    })
    .join('\n')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`
}

// ── EmDataTable ──────────────────────────────────────────────
export interface DataRow {
  label: string
  value: string
  mono?: boolean
  strong?: boolean
  color?: string
  href?: string
}

export const dataTable = (rows: DataRow[]): string => {
  const body = rows
    .map((rowItem, index) => {
      const divider =
        index === 0 ? '' : `border-top: 1px solid ${ME.borderSoft};`
      const valueFont = rowItem.mono === false ? FONT : MONO
      const weight = rowItem.strong === true ? 700 : 500
      const valueColor = rowItem.color ?? ME.fg
      const valueInner =
        rowItem.href === undefined
          ? escapeHtml(rowItem.value)
          : `<a href="${escapeHtml(rowItem.href)}" style="color: ${ME.signal}; font-weight: 700; text-decoration: none;">${escapeHtml(rowItem.value)}</a>`
      return `<tr>
<td style="padding: 12px 16px; ${divider} font-family: ${MONO}; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: ${ME.subtle}; white-space: nowrap; width: 42%; vertical-align: middle;">${escapeHtml(rowItem.label)}</td>
<td style="padding: 12px 16px; ${divider} font-family: ${valueFont}; font-size: 12.5px; font-weight: ${weight}; color: ${valueColor}; text-align: right; vertical-align: middle;">${valueInner}</td>
</tr>`
    })
    .join('\n')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${ME.surf}; border-radius: 12px; border: 1px solid ${ME.border}; overflow: hidden;">${body}</table>`
}

// ── EmCallout ────────────────────────────────────────────────
interface CalloutInput {
  inner: string
  accent?: string
  soft?: string
}

export const callout = ({
  inner,
  accent = ME.signal,
  soft,
}: CalloutInput): string =>
  `<div style="border-radius: 12px; padding: 15px 16px; background: ${soft ?? `${accent}14`}; border: 1px solid ${accent}44;">${inner}</div>`

// ── EmPricePromise ───────────────────────────────────────────
interface PricePromiseInput {
  tier: EmailTier
  subtle?: boolean
}

export const pricePromise = ({
  tier,
  subtle = false,
}: PricePromiseInput): string => {
  const text = PRICE_PROMISE[tier]
  if (text === undefined) return ''
  if (subtle) {
    return `<div style="font-family: ${MONO}; font-size: 10px; color: ${ME.subtle}; letter-spacing: 0.04em; line-height: 1.5;"><span style="color: ${ME.accent};">&#128274;</span> ${escapeHtml(text)}</div>`
  }
  return `<div style="padding: 11px 13px; border-radius: 10px; background: ${ME.accentSoft}; border: 1px solid ${ME.accent}33; font-family: ${FONT}; font-weight: 600; font-size: 12.5px; color: ${ME.muted}; line-height: 1.45;"><span style="color: ${ME.accent};">&#128274;</span> ${escapeHtml(text)}</div>`
}

// ── EmSeatStamp ──────────────────────────────────────────────
export const seatStamp = (seat: number): string =>
  `<div style="padding: 16px 18px; border-radius: 12px; background: linear-gradient(150deg, rgba(255,123,212,0.10), rgba(122,230,255,0.08)); border: 1px solid ${ME.signal}44;">
<div style="font-family: ${FONT}; font-weight: 900; font-size: 40px; color: ${ME.fg}; letter-spacing: -0.04em; line-height: 1;">#${seat}</div>
<div style="font-family: ${MONO}; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: ${ME.subtle}; margin-top: 5px;">of 100</div>
<div style="font-family: ${FONT}; font-weight: 800; font-size: 15px; color: ${ME.fg}; margin-top: 12px;">Founder. Locked in.</div>
<div style="font-family: ${MONO}; font-size: 10.5px; color: ${ME.signal}; margin-top: 4px;">$3 / mo — never goes up, ever</div>
</div>`

// ── status eyebrow (dot + mono eyebrow) ──────────────────────
interface StatusEyebrowInput {
  text: string
  color: string
}

export const statusEyebrow = ({ text, color }: StatusEyebrowInput): string =>
  `<span style="display: inline-block;"><span style="width: 7px; height: 7px; border-radius: 7px; background: ${color}; display: inline-block; vertical-align: middle; margin-right: 8px;"></span><span style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.15em; color: ${color}; text-transform: uppercase; font-weight: 700; vertical-align: middle;">${escapeHtml(text)}</span></span>`

// ── card-on-file chip ────────────────────────────────────────
export const cardChip = (brandLast4: string, exp: string): string =>
  `<span style="display: inline-block; padding: 9px 13px; border-radius: 10px; background: ${ME.surf}; border: 1px solid ${ME.border}; font-family: ${MONO}; font-size: 11.5px; color: ${ME.fg}; letter-spacing: 0.04em;">${escapeHtml(brandLast4)} <span style="color: ${ME.subtle}; font-size: 10.5px;">${escapeHtml(exp)}</span></span>`

// ── receipt amount hero ──────────────────────────────────────
interface AmountHeroInput {
  amount: string
  subline: string
  badge: string
  accent?: string
}

export const amountHero = ({
  amount,
  subline,
  badge,
  accent = ME.signal,
}: AmountHeroInput): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align: middle;">
<div style="font-family: ${FONT}; font-weight: 900; font-size: 44px; line-height: 1; color: ${accent}; letter-spacing: -0.045em;">${escapeHtml(amount)}</div>
<div style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${ME.subtle}; margin-top: 8px;">${escapeHtml(subline)}</div>
</td>
<td style="text-align: right; vertical-align: top;">${badge}</td>
</tr></table>`

// ── EmFooter ─────────────────────────────────────────────────
interface FooterInput {
  family: 'billing' | 'product'
  showManage: boolean
  note?: string
}

export const footerRow = ({ family, showManage, note }: FooterInput): string =>
  `<tr><td style="padding: 18px 26px 24px; border-top: 1px solid ${ME.border};">
${note === undefined ? '' : `<div style="font-family: ${FONT}; font-size: 11.5px; color: ${ME.subtle}; line-height: 1.6; margin-bottom: 10px;">${escapeHtml(note)}</div>`}
<div style="font-family: ${FONT}; font-size: 12px; line-height: 1.9;">
<a href="${escapeHtml(notificationsUrl())}" style="color: ${ME.muted}; text-decoration: underline;">Turn off ${family} emails</a>
<span style="color: ${ME.subtle};"> · </span>
<a href="${escapeHtml(notificationsUrl())}" style="color: ${ME.subtle}; text-decoration: underline;">all email settings</a>
${showManage ? `<span style="color: ${ME.subtle};"> · </span><a href="${escapeHtml(planUrl())}" style="color: ${ME.subtle}; text-decoration: underline;">manage subscription</a>` : ''}
</div>
<div style="font-family: ${MONO}; font-size: 9.5px; color: ${ME.subtle}; margin-top: 12px; letter-spacing: 0.06em;">${LEGAL_LINE}</div>
</td></tr>`

// ── rich text section (pre-built inner HTML, e.g. bolded phrase) ──
export const richTextRow = (pad: string, html: string): string =>
  `<tr><td style="padding: ${pad};">${html}</td></tr>`

export { escapeHtml }
