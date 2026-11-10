// apps/api/src/emails/types.ts
//
// Template module contract (eng infra spec Part 2 §4.2) + the per-template
// vars shapes derived from the #783 design brief's variable lists.

import type { EmailTemplateKey } from '@concert-crawl/db';

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

export type TemplateRenderer<Vars> = (vars: Vars) => RenderedEmail;

// The templates that still have a sender. EMAIL_TEMPLATE_KEYS in
// @concert-crawl/db keeps the retired billing and lifecycle keys because
// email_template_config and email_send_log rows still carry them (no
// migration); the render and send side is typed against this narrower set,
// so a send for a retired template no longer typechecks. Retired 2026-11-10
// with the go-free ruling: welcome, receipts, dunning, card-expiry,
// cancellation, gift-ending and win-back.
export type LiveEmailTemplateKey = Extract<EmailTemplateKey, 'spotify_digest'>;

// Nullable fields are vars a trigger cannot always derive — templates own the
// fallback copy.
export interface EmailTemplateVars {
  spotify_digest: {
    // All of the week's matched shows — the template features the first 5 and
    // collapses the rest into "+N more this week". Empty = zero-week variant.
    shows: DigestEmailShow[];
    // Up to 2 taste-based picks shown ONLY on zero weeks (design lock: the
    // email always earns its open).
    tastePicks: DigestEmailShow[];
    // Signed one-click opt-out (#763 §8.2). Null when EMAIL_UNSUBSCRIBE_SECRET
    // is unset — the footer then falls back to the Settings link.
    unsubscribeUrl: string | null;
  };
}

// One digest show row (#763 spec §8.2, design mock digest-email.jsx). Labels
// arrive pre-formatted — the job owns Denver-timezone date and price display.
export interface DigestEmailShow {
  artist: string;
  tourName: string | null;
  venue: string;
  dateLabel: string;
  priceLabel: string | null;
  url: string;
}
