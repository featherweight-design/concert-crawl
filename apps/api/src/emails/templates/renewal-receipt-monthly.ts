// renewal_receipt_monthly — formal-leaning (#783: users forward these to
// accountants). Structured tax-record block up top; the tone loosens below it.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import {
  EMAIL_BORDER,
  EMAIL_SUCCESS_GREEN,
  EMAIL_TEXT_MUTED,
} from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { formatEmailDate } from './format.js'

const SUBJECT = 'Your monthly receipt from Concert Crawl'
const PREHEADER =
  'Amount, charge date, and your Stripe receipt link — everything the accountant needs.'

const AMOUNT_FALLBACK = 'See Stripe receipt'
const PLAN_FALLBACK = 'Monthly subscription'
const RECEIPT_FALLBACK = 'Not available for this charge'

const recordRowHtml = (label: string, valueHtml: string): string =>
  `<tr>
<td style="padding: 8px 12px; border-bottom: 1px solid ${EMAIL_BORDER}; font-size: 14px; color: ${EMAIL_TEXT_MUTED}; white-space: nowrap;">${escapeHtml(label)}</td>
<td style="padding: 8px 12px; border-bottom: 1px solid ${EMAIL_BORDER}; font-size: 14px;">${valueHtml}</td>
</tr>`

export const renderRenewalReceiptMonthly: TemplateRenderer<
  EmailTemplateVars['renewal_receipt_monthly']
> = ({
  periodLabel,
  amount,
  tierName,
  periodEnd,
  chargeDate,
  customerId,
  stripeReceiptUrl,
}) => {
  const chargeDateLabel = formatEmailDate(chargeDate) ?? '—'
  const periodEndLabel = formatEmailDate(periodEnd)
  const amountLabel = amount ?? AMOUNT_FALLBACK
  const planLabel = tierName ?? PLAN_FALLBACK

  const recordRows = [
    recordRowHtml('Amount', escapeHtml(amountLabel)),
    recordRowHtml('Charge date', escapeHtml(chargeDateLabel)),
    recordRowHtml('Plan', escapeHtml(planLabel)),
    recordRowHtml('Customer ID', escapeHtml(customerId)),
    recordRowHtml(
      'Receipt',
      stripeReceiptUrl === null
        ? escapeHtml(RECEIPT_FALLBACK)
        : `<a href="${escapeHtml(stripeReceiptUrl)}" style="color: ${EMAIL_SUCCESS_GREEN};">View Stripe receipt</a>`,
    ),
  ].join('\n')

  const lockedInSentence =
    periodEndLabel === null ? null : `You're locked in until ${periodEndLabel}!`

  const bodyHtml = `<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${EMAIL_SUCCESS_GREEN};">Receipt — ${escapeHtml(periodLabel)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px; border: 1px solid ${EMAIL_BORDER}; border-radius: 6px; border-collapse: separate;">
${recordRows}
</table>
<p style="margin: 0 0 16px;">Your subscription renewed and everything is humming along. ${lockedInSentence === null ? '' : escapeHtml(lockedInSentence)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};">Keep this one for your records — it has everything a tax return could ask for.</p>`

  const textLines = [
    `Receipt — ${periodLabel}`,
    '',
    `Amount: ${amountLabel}`,
    `Charge date: ${chargeDateLabel}`,
    `Plan: ${planLabel}`,
    `Customer ID: ${customerId}`,
    stripeReceiptUrl === null
      ? `Receipt: ${RECEIPT_FALLBACK}`
      : `View Stripe receipt: ${stripeReceiptUrl}`,
    '',
    'Your subscription renewed and everything is humming along.',
    ...(lockedInSentence === null ? [] : [lockedInSentence]),
    '',
    'Keep this one for your records — it has everything a tax return could ask for.',
  ]

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
