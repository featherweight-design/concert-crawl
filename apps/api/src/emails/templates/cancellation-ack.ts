// cancellation_ack — warm confirmation, deliberately NOT a sales surface (#783
// brand pass, locked decision: no win-back pitch, no discount hook). Neutral
// muted dot, an access-until panel, a plain "what changes" rundown, and a ghost
// "Manage subscription" affordance. Billing footer with NO manage link — the
// payment relationship is ending.

import {
  button,
  footerRow,
  headerRow,
  ledeRow,
  monoEyebrow,
  row,
  statusEyebrow,
} from '../atoms.js'
import {
  EMAIL_FONT,
  ME,
  escapeHtml,
  planUrl,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { formatEmailDate } from './format.js'

const SUBJECT = "Your Premium's set to wind down."
const FOOTER_NOTE =
  "If this cancel was a surprise, reply to this email and we'll sort it out."
const CHANGES_BODY_TEXT =
  "History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free, same as always. Everything you're watching stays put."

const CONTENT_PAD = '18px 26px 0'

export const renderCancellationAck: TemplateRenderer<
  EmailTemplateVars['cancellation_ack']
> = ({ accessEndsAt }) => {
  const accessValue =
    formatEmailDate(accessEndsAt) ?? 'the end of your billing period'
  const preheader = `You're good through ${accessValue}. No hooks, no hard feelings.`
  const sub = `Done. We won't bill you again. Premium keeps working right up until ${accessValue}, then your account drops back to Free.`

  const accessPanel = `<div style="padding: 16px 18px; border-radius: 12px; background: ${ME.surf}; border: 1px solid ${ME.border};">
${monoEyebrow({ text: 'Premium works until', color: ME.subtle, marginBottom: 8 })}
<div style="font-family: ${EMAIL_FONT}; font-weight: 900; font-size: 24px; color: ${ME.fg}; letter-spacing: -0.02em;">${escapeHtml(accessValue)}</div>
</div>`

  const changesBody = `${monoEyebrow({ text: 'What changes after that', color: ME.subtle, marginBottom: 10 })}
<div style="font-family: ${EMAIL_FONT}; font-size: 13.5px; color: ${ME.muted}; line-height: 1.55;">History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free, same as always. <span style="color: ${ME.fg}; font-weight: 700;">Everything you're watching stays put.</span></div>`

  const bodyRows = [
    headerRow('Subscription'),
    row('22px 26px 0', statusEyebrow({ text: 'Cancelled', color: ME.muted })),
    ledeRow({ title: 'Cancelled. No more charges.', sub, titleSize: 26 }),
    row(CONTENT_PAD, accessPanel),
    row(CONTENT_PAD, changesBody),
    row(
      '20px 26px 6px',
      button({ label: 'Manage subscription', tone: 'ghost', href: planUrl() }),
    ),
    footerRow({ family: 'billing', showManage: false, note: FOOTER_NOTE }),
  ].join('\n')

  const text = [
    'Cancelled. No more charges.',
    '',
    sub,
    '',
    `Premium works until: ${accessValue}`,
    '',
    'What changes after that',
    CHANGES_BODY_TEXT,
    '',
    `Manage subscription: ${planUrl()}`,
  ].join('\n')

  return {
    subject: SUBJECT,
    preheader,
    html: renderEmailShell({ preheader, bodyRows }),
    text: renderTextShell({ body: text, family: 'billing', showManage: false }),
  }
}
