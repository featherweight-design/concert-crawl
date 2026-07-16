// Shared receipt renderer for renewal_receipt_monthly + renewal_receipt_annual
// (#783 brand pass). The two keys carry identical vars; the only differences —
// title/sub, hero subline word, the annual "two months on the house" note, and
// the date framing — flex on the `period` discriminator. Founder receipts swap
// the title and add a subtle price-promise row.
//
// Data rows render only fields the send pipeline actually supplies (plan,
// amount, charge date, next renewal, customer ID, receipt link). The design
// mock also showed a card-on-file chip and a billing-period-start row; those
// aren't in the vars contract, so they're intentionally omitted (see gap
// report) rather than fabricated.

import {
  amountHero,
  button,
  dataTable,
  footerRow,
  headerRow,
  ledeRow,
  pricePromise,
  row,
  tierBadge,
} from '../atoms.js'
import type { DataRow } from '../atoms.js'
import {
  EMAIL_MONO,
  ME,
  escapeHtml,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import { TIER_META } from '../palette.js'
import type { EmailTemplateVars, RenderedEmail } from '../types.js'
import { formatEmailDate, formatMonthName, formatShortDate } from './format.js'

type ReceiptPeriod = 'monthly' | 'annual'

const FOOTER_NOTE =
  'Questions about a charge? Reply to this email — a human reads it.'
const AMOUNT_FALLBACK = 'See receipt'

const CONTENT_PAD = '18px 26px 0'

export const renderReceipt = (
  period: ReceiptPeriod,
  vars:
    | EmailTemplateVars['renewal_receipt_monthly']
    | EmailTemplateVars['renewal_receipt_annual'],
): RenderedEmail => {
  const {
    amount,
    tierName,
    periodEnd,
    chargeDate,
    customerId,
    stripeReceiptUrl,
    tier,
  } = vars
  const isFounder = tier === 'founder'
  const badgeTier = tier ?? 'premium'
  const periodWord = period === 'annual' ? 'annual' : 'monthly'
  const periodTitleWord = period === 'annual' ? 'Annual' : 'Monthly'

  const amountLabel = amount ?? AMOUNT_FALLBACK
  const chargedLong = formatEmailDate(chargeDate) ?? chargeDate
  const chargedShort = formatShortDate(chargeDate) ?? chargeDate
  const renewalLong = formatEmailDate(periodEnd)
  const renewalShort = formatShortDate(periodEnd)
  const planLabel = tierName ?? TIER_META[badgeTier].label

  const title =
    period === 'annual'
      ? 'Another year of Premium. Locked in.'
      : isFounder
        ? "Founder's paid up. Same $3."
        : `${planLabel}'s paid up.`

  const sub =
    period === 'annual'
      ? "Your annual plan renewed. Keep this for your records — it's your receipt for the next twelve months."
      : 'Your subscription renewed on schedule. Keep this one for your records.'

  const subject =
    period === 'annual'
      ? 'Another year of Premium — receipt inside.'
      : isFounder
        ? "Founder's paid up — $3, same as always."
        : `${planLabel}'s paid up for ${formatMonthName(chargeDate) ?? 'this month'}.`

  const preheader =
    period === 'annual'
      ? `${amountLabel} on ${chargedShort}. Renews ${renewalLong ?? 'next year'}. Two months on the house.`
      : isFounder
        ? `${amountLabel} on ${chargedShort}. Next renewal ${renewalShort ?? 'soon'}. Locked forever.`
        : `${amountLabel} on ${chargedShort}. Next renewal ${renewalShort ?? 'soon'}. Receipt inside.`

  const heroSubline = `Paid · ${chargedLong} · ${periodTitleWord}`

  const dataRows: DataRow[] = [
    { label: 'Plan', value: `${planLabel} · ${periodWord}`, strong: true },
    { label: 'Amount', value: amountLabel, color: ME.signal, strong: true },
    { label: 'Charged', value: chargedLong },
    ...(renewalLong === null
      ? []
      : [{ label: 'Next renewal', value: renewalLong }]),
    { label: 'Customer ID', value: customerId },
    ...(stripeReceiptUrl === null
      ? []
      : [
          {
            label: 'Receipt',
            value: 'View on Stripe →',
            href: stripeReceiptUrl,
          },
        ]),
  ]

  const annualNote =
    amount === null
      ? 'Two months on the house versus paying monthly.'
      : `Annual runs ${amount} — two months on the house versus paying monthly.`

  const annualNoteRow =
    period === 'annual'
      ? row(
          '14px 26px 0',
          `<div style="font-family: ${EMAIL_MONO}; font-size: 10px; letter-spacing: 0.04em; color: ${ME.subtle}; line-height: 1.5;">${escapeHtml(annualNote)}</div>`,
        )
      : ''

  const founderPromiseRow =
    isFounder && period === 'monthly'
      ? row(CONTENT_PAD, pricePromise({ tier: 'founder', subtle: true }))
      : ''

  const ctaRow =
    stripeReceiptUrl === null
      ? ''
      : row(
          '20px 26px 6px',
          button({
            label: 'View full receipt on Stripe →',
            tone: 'ghost',
            href: stripeReceiptUrl,
          }),
        )

  const bodyRows = [
    headerRow('Receipt'),
    ledeRow({ eyebrow: 'Payment received', title, sub, titleSize: 25 }),
    row(CONTENT_PAD, tierBadge({ tier: badgeTier })),
    row(
      CONTENT_PAD,
      amountHero({
        amount: amountLabel,
        subline: heroSubline,
        badge: '',
        accent: ME.signal,
      }),
    ),
    founderPromiseRow,
    annualNoteRow,
    row(CONTENT_PAD, dataTable(dataRows)),
    ctaRow,
    footerRow({ family: 'billing', showManage: true, note: FOOTER_NOTE }),
  ]
    .filter((rowStr) => rowStr !== '')
    .join('\n')

  const textLines = [
    title,
    '',
    sub,
    '',
    `Amount: ${amountLabel}`,
    `Charged: ${chargedLong}`,
    ...(renewalLong === null ? [] : [`Next renewal: ${renewalLong}`]),
    `Plan: ${planLabel} · ${periodWord}`,
    `Customer ID: ${customerId}`,
    ...(stripeReceiptUrl === null
      ? []
      : [`Full receipt on Stripe: ${stripeReceiptUrl}`]),
    ...(period === 'annual' ? ['', annualNote] : []),
    ...(isFounder && period === 'monthly'
      ? ['', '$3 is $3. New folks may pay double someday — never you.']
      : []),
  ]

  return {
    subject,
    preheader,
    html: renderEmailShell({ preheader, bodyRows }),
    text: renderTextShell({
      body: textLines.join('\n'),
      family: 'billing',
      showManage: true,
    }),
  }
}
