// apps/api/src/emails/layout.ts
//
// Shared HTML/plain-text scaffolding for every transactional template
// (#783 §5): table-based structure, inline styles only, 600px max-width on a
// 320px baseline, and exactly ONE <style> block in <head> carrying only the
// mobile media query (clients that strip it fall through to the inline
// single-column layout). Templates (PRs 5.2/5.3) supply subject, preheader,
// and body; this module owns the chrome + footer.

import {
  EMAIL_BACKGROUND,
  EMAIL_BORDER,
  EMAIL_SURFACE,
  EMAIL_TEXT,
  EMAIL_TEXT_MUTED,
} from './palette.js'

const MANAGE_EMAILS_URL = 'https://concertcrawl.app/settings/notifications'
const LEGAL_LINE = 'Concert Crawl · Denver, CO'

const FONT_STACK =
  "'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

interface EmailShellInput {
  preheader: string
  bodyHtml: string
}

export const renderEmailShell = ({
  preheader,
  bodyHtml,
}: EmailShellInput): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@media (max-width: 600px) {
  .cc-container { width: 100% !important; }
  .cc-body { padding: 24px 16px !important; }
  .cc-footer { padding: 16px !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_BACKGROUND};">
<span style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_BACKGROUND};">
<tr>
<td align="center" style="padding: 24px 12px;">
<table role="presentation" class="cc-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: ${EMAIL_SURFACE}; border: 1px solid ${EMAIL_BORDER}; border-radius: 8px;">
<tr>
<td class="cc-body" style="padding: 32px 40px; font-family: ${FONT_STACK}; font-size: 16px; line-height: 1.5; color: ${EMAIL_TEXT};">
${bodyHtml}
</td>
</tr>
<tr>
<td class="cc-footer" style="padding: 20px 40px; border-top: 1px solid ${EMAIL_BORDER}; font-family: ${FONT_STACK}; font-size: 12px; line-height: 1.5; color: ${EMAIL_TEXT_MUTED};">
${LEGAL_LINE}<br>
<a href="${MANAGE_EMAILS_URL}" style="color: ${EMAIL_TEXT_MUTED}; text-decoration: underline;">Manage emails</a>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`

export const renderTextShell = (bodyText: string): string =>
  [bodyText, '', '—', LEGAL_LINE, `Manage emails: ${MANAGE_EMAILS_URL}`].join(
    '\n',
  )
