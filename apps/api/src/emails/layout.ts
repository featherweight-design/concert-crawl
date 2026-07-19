// apps/api/src/emails/layout.ts
//
// Shared HTML/plain-text scaffolding for every transactional template (#783
// brand pass): table-based structure, inline styles only, a 600px card on the
// dark `ME.page` background, 320px-safe, and exactly ONE <style> block in
// <head> carrying only the mobile media query (clients that strip it fall
// through to the inline single-column layout). Atoms live in atoms.ts;
// templates supply subject, preheader, and the composed body rows.

import { EMAIL_FONT, EMAIL_MONO, ME } from './palette.js'

// Environment-specific web origin, same convention as app.ts CORS and the
// billing portal return_url — staging/local emails must not link prod.
const webOrigin = (): string =>
  process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000'

// The web app's user settings live under /me, driven by a ?section= query
// param (see SettingsRouteDesktop NavSection: profile|plan|appearance|
// submissions|account|danger). There is no dedicated email-preferences route
// yet, so the notification links land on the settings home; see follow-up
// issue for the missing unsubscribe UI.
export const notificationsUrl = (): string => `${webOrigin()}/me`
export const planUrl = (): string => `${webOrigin()}/me?section=plan`
export const profileUrl = (): string => `${webOrigin()}/me?section=profile`
export const appUrl = (): string => webOrigin()

export const LEGAL_LINE = 'Concert Crawl · Denver, CO'

// Preheaders + section copy carry template vars (gifter names, tier labels) —
// escape so injected markup can't break the shell or smuggle links.
export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

interface EmailShellInput {
  preheader: string
  bodyRows: string
}

// bodyRows is a concatenation of `<tr>` strings (from atoms.ts) dropped
// directly into the 600px card table — matching the design's EmShell, where
// every section is a full-width row owning its own padding.
export const renderEmailShell = ({
  preheader,
  bodyRows,
}: EmailShellInput): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@media (max-width: 600px) {
  .cc-container { width: 100% !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${ME.page};">
<span style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${ME.page};">
<tr>
<td align="center" style="padding: 24px 0; font-family: ${EMAIL_FONT};">
<table role="presentation" class="cc-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 100%; background-color: ${ME.card}; border: 1px solid ${ME.border}; border-radius: 16px; overflow: hidden;">
${bodyRows}
</table>
</td>
</tr>
</table>
</body>
</html>`

// 'digest' is the #763 weekly Spotify digest family — its per-family footer
// link is a signed one-click unsubscribe URL instead of Settings (spec §8.2),
// supplied by the template via `unsubscribeUrl`.
export type EmailFamily = 'billing' | 'product' | 'digest'

export const familyUnsubscribeLabel = (family: EmailFamily): string =>
  family === 'digest'
    ? 'Turn off the weekly digest'
    : `Turn off ${family} emails`

interface TextShellInput {
  body: string
  family: EmailFamily
  showManage: boolean
  unsubscribeUrl?: string
}

const TEXT_RULE = '----------------------------------------'

// Plain-text footer mirrors the HTML EmFooter contract: per-family
// unsubscribe first, all-settings second, manage-subscription only where a
// payment relationship exists, then the legal line.
export const renderTextShell = ({
  body,
  family,
  showManage,
  unsubscribeUrl,
}: TextShellInput): string => {
  const lines = [
    body,
    '',
    TEXT_RULE,
    `${familyUnsubscribeLabel(family)}:  ${unsubscribeUrl ?? notificationsUrl()}`,
    `All email settings:       ${notificationsUrl()}`,
    ...(showManage ? [`Manage subscription:      ${planUrl()}`] : []),
    LEGAL_LINE,
  ]
  return lines.join('\n')
}

// Re-exported so atoms.ts and templates share the exact font stacks.
export { EMAIL_FONT, EMAIL_MONO, ME }
