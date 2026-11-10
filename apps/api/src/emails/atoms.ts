// apps/api/src/emails/atoms.ts
//
// String-HTML port of the design atom library
// (design/design_handoff_monetization_emails/email-primitives.jsx). Each atom
// returns an HTML fragment; row atoms return a full-width `<tr>` that drops
// into the 600px card table in renderEmailShell. Inline atoms return spans/
// divs a template composes inside a `row(...)`. The atoms only the retired
// billing and lifecycle templates used were removed 2026-11-10 (go-free).

import {
  EMAIL_FONT as FONT,
  EMAIL_MONO as MONO,
  LEGAL_LINE,
  ME,
  escapeHtml,
  familyUnsubscribeLabel,
  notificationsUrl,
  planUrl,
  type EmailFamily,
} from './layout.js';

// ── generic row wrapper ──────────────────────────────────────
export const row = (pad: string, inner: string): string =>
  `<tr><td style="padding: ${pad};">${inner}</td></tr>`;

// ── EmWordmark ───────────────────────────────────────────────
export const wordmark = (): string =>
  `<span style="font-family: ${FONT}; font-weight: 800; font-size: 17px; color: ${ME.fg}; letter-spacing: -0.02em;">concert <span style="color: ${ME.accent};">crawl.</span></span>`;

// ── EmHeader ─────────────────────────────────────────────────
export const headerRow = (eyebrow?: string): string =>
  `<tr><td style="padding: 22px 26px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align: middle;">${wordmark()}</td>
${eyebrow === undefined ? '' : `<td style="text-align: right; vertical-align: middle; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.16em; color: ${ME.subtle}; text-transform: uppercase; font-weight: 700;">${escapeHtml(eyebrow)}</td>`}
</tr></table>
</td></tr>`;

// ── EmFooter ─────────────────────────────────────────────────
interface FooterInput {
  family: EmailFamily;
  showManage: boolean;
  note?: string;
  // Per-family one-click unsubscribe URL (digest family, #763 §8.2). When
  // absent, the per-family link falls back to the Settings page like every
  // other family.
  unsubscribeUrl?: string;
}

export const footerRow = ({
  family,
  showManage,
  note,
  unsubscribeUrl,
}: FooterInput): string =>
  `<tr><td style="padding: 18px 26px 24px; border-top: 1px solid ${ME.border};">
${note === undefined ? '' : `<div style="font-family: ${FONT}; font-size: 11.5px; color: ${ME.subtle}; line-height: 1.6; margin-bottom: 10px;">${escapeHtml(note)}</div>`}
<div style="font-family: ${FONT}; font-size: 12px; line-height: 1.9;">
<a href="${escapeHtml(unsubscribeUrl ?? notificationsUrl())}" style="color: ${ME.muted}; text-decoration: underline;">${familyUnsubscribeLabel(family)}</a>
<span style="color: ${ME.subtle};"> · </span>
<a href="${escapeHtml(notificationsUrl())}" style="color: ${ME.subtle}; text-decoration: underline;">all email settings</a>
${showManage ? `<span style="color: ${ME.subtle};"> · </span><a href="${escapeHtml(planUrl())}" style="color: ${ME.subtle}; text-decoration: underline;">manage subscription</a>` : ''}
</div>
<div style="font-family: ${MONO}; font-size: 9.5px; color: ${ME.subtle}; margin-top: 12px; letter-spacing: 0.06em;">${LEGAL_LINE}</div>
</td></tr>`;

export { escapeHtml };
