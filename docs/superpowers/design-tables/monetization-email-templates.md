# Design Lock Table — PR 5.2 Email Templates

Sources: **[Brief]** = `docs/superpowers/specs/2026-06-27-monetization-emails-design.md` (#783), **[Eng §4]** = `docs/superpowers/specs/2026-07-10-monetization-eng-infra-design-part-2.md` §4.

## Global format locks

| #   | Lock                                                                                                                                                               | Source                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| G1  | Subject line: 35–50 chars                                                                                                                                          | Brief §6                      |
| G2  | Subject line: sentence case                                                                                                                                        | Brief §6                      |
| G3  | Subject line: no emojis (transactional)                                                                                                                            | Brief §6                      |
| G4  | Subject line: no `[Concert Crawl]` prefix — sender name + brand recognition handle that                                                                            | Brief §6                      |
| G5  | Preheader: 50–100 chars                                                                                                                                            | Brief §6                      |
| G6  | Preheader completes/extends the subject's promise — not filler                                                                                                     | Brief §6                      |
| G7  | Every template specifies both subject AND preheader                                                                                                                | Brief §6                      |
| G8  | Every template ships HTML + plain-text fallback                                                                                                                    | Brief §5                      |
| G9  | Inline styles for all base layout (Gmail strips `<style>`; Outlook partial support) — **shell-owned** (verified PR 5.1)                                            | Brief §5                      |
| G10 | Table-based structure for cross-client safety — **shell-owned** (verified PR 5.1)                                                                                  | Brief §5                      |
| G11 | Single small `<style>` block in `<head>` for media queries only; design degrades gracefully without it — **shell-owned** (verified PR 5.1)                         | Brief §5                      |
| G12 | Mobile-first: 320px baseline, `max-width: 600px` container, `@media (max-width: 600px)` → single-column / larger touch targets — **shell-owned** (verified PR 5.1) | Brief §5                      |
| G13 | No CSS variables / token vocabulary — constrained inline palette: brand primary, neutral text gray, warning amber (dunning), success green (receipts)              | Brief §5                      |
| G14 | Palette constants live in `apps/api/src/emails/palette.ts` (email-only palette)                                                                                    | Eng §4.2                      |
| G15 | Logo: PNG (not SVG), retina-tagged, CDN-hosted — **shell-owned** (verified PR 5.1)                                                                                 | Brief §5                      |
| G16 | Footer block: legal address + "manage emails" link → `/settings/notifications` — **shell-owned** (verified PR 5.1)                                                 | Brief §5                      |
| G17 | Default voice = Sour Patch Kids: slight cheek + honesty rail + warmth                                                                                              | Brief §4, Decisions inherited |
| G18 | No price escalation — dollar amount on receipt matches what the user signed up at (#782 price promise)                                                             | Brief, Decisions inherited    |

## Module contract (eng-spec §4.2)

| #   | Lock                                                                                                                                        | Source   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M1  | Location: `apps/api/src/emails/` — one module per template key                                                                              | Eng §4.2 |
| M2  | Each module exports per interface `RenderedEmail { subject: string; preheader: string; html: string; text: string }`                        | Eng §4.2 |
| M3  | Renderer shape: `TemplateRenderer<Vars> = (vars: Vars) => RenderedEmail` — pure/plain TS string-template functions                          | Eng §4.2 |
| M4  | No JSX email framework                                                                                                                      | Eng §4.2 |
| M5  | Copy strings live in the email modules themselves (not web `definitions/copy.ts` — that convention governs UI strings; emails are API-side) | Eng §4.2 |
| M6  | Sender: `billing@concertcrawl.app`, display name "Concert Crawl"; reply-to `support@concertcrawl.app`                                       | Eng §4.1 |

## Template: welcome_paid

| #    | Lock                                                                                                                                                          | Source                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| WP1  | One template family with 3 tier-coded visual variants: Premium / Supporter / Founder                                                                          | Brief §1, §7                 |
| WP2  | Voice tilt: casual + warm                                                                                                                                     | Brief §1                     |
| WP3  | Color accent shifts per tier, matching #781 tier card accents — Premium signal, Supporter warm, Founder badge                                                 | Brief §7                     |
| WP4  | Headline copy acknowledges the tier name + price paid                                                                                                         | Brief §7                     |
| WP5  | Price values: — (brief does not restate dollar amounts; prices locked in #781. Caller-supplied $5/$2/$3 values must be verified against #781, not this brief) | Brief §1/§7 (defers to #781) |
| WP6  | Body unlock list mirrors the entitlements matrix from #781                                                                                                    | Brief §7                     |
| WP7  | Founder variant adds seat number "You're #N of 100" — matches locked "Founder #N of 100" formatting from #781 post-claim takeover                             | Brief §7                     |
| WP8  | Founder variant adds the lifetime founder badge in the header                                                                                                 | Brief §7                     |
| WP9  | Trigger: new subscription confirmed (`invoice.payment_succeeded`, `billing_reason: subscription_create`)                                                      | Brief §1 / Eng §4.4          |
| WP10 | Example subject shape: `You're in — Premium's live` (Design refines exact copy)                                                                               | Brief §6                     |
| WP11 | Example preheader shape: `Concert history, calendar export, the lot. Here's what's unlocked.` (Design refines)                                                | Brief §6                     |
| WP12 | Open-to-Design (not a lock): badge/seat-number layout; optional "what's coming" teaser carousel                                                               | Brief, Open for Design       |

## Template: welcome_gifted

| #   | Lock                                                                                                                                                                    | Source                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| WG1 | Single template — separate from welcome_paid, with its own visual treatment                                                                                             | Brief §1, §7, deliverable 5 |
| WG2 | Voice tilt: casual + warm                                                                                                                                               | Brief §1                    |
| WG3 | Names the gifter ("from {gifter_name}")                                                                                                                                 | Brief §1, §7                |
| WG4 | States the gift duration end date                                                                                                                                       | Brief §1, §7                |
| WG5 | Sets expectations for what happens when the gift wraps                                                                                                                  | Brief §1                    |
| WG6 | Primary CTA → "Add a card for when this wraps" — soft, not pushy; first nudge toward conversion                                                                         | Brief §7                    |
| WG7 | Distinct from welcome_paid because: audience hasn't transacted; conversion clock is gift-end (not renewal-cycle); body unlock list points forward to the wrap-up moment | Brief §7                    |
| WG8 | Trigger: gift redeemed by recipient (admin gift-grant flow / gifted_comps insert)                                                                                       | Brief §1 / Eng §4.4         |

## Template: renewal_receipt_monthly

| #    | Lock                                                                                                                                      | Source                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| RR1  | Voice tilt: formal-leaning (tax record) — users may forward to accountants                                                                | Brief §1, §4                                                                                                                            |
| RR2  | Single template w/ tier var                                                                                                               | Brief §1                                                                                                                                |
| RR3  | Structured block at the TOP surfacing: dollar amount, charge date, plan/tier name, customer ID, Stripe receipt link                       | Brief §4 (§1 confirms: `{amount}` + `{charge_date}` + `{tier_name}` + `{customer_id}` + `{stripe_receipt_url}` in the tax-record block) |
| RR4  | Body copy below the block may stay casual — e.g. "You're locked in until {period_end}!"                                                   | Brief §4                                                                                                                                |
| RR5  | Template variables: `{period_label}`, `{amount}`, `{tier_name}`, `{period_end}`, `{charge_date}`, `{customer_id}`, `{stripe_receipt_url}` | Brief §1, §2                                                                                                                            |
| RR6  | Variables designed so an annual variant is a copy-change away; **no separate annual template ships this cycle**                           | Brief §1, §2                                                                                                                            |
| RR7  | Receipt amount honors the price-promise from #782 (no escalation)                                                                         | Brief, Decisions inherited                                                                                                              |
| RR8  | Success-green accent belongs to receipts in the email palette                                                                             | Brief §5                                                                                                                                |
| RR9  | Example subject shape: `Receipt for your June renewal` (Design refines)                                                                   | Brief §6                                                                                                                                |
| RR10 | Trigger: monthly renewal charge succeeds (`invoice.payment_succeeded`, renewal reasons)                                                   | Brief §1 / Eng §4.4                                                                                                                     |

## Template: cancellation_ack

| #   | Lock                                                                                                                                                | Source                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| CA1 | Voice tilt: warm + gracious                                                                                                                         | Brief §1, §4                |
| CA2 | Single template w/ tier var                                                                                                                         | Brief §1                    |
| CA3 | Confirms cancel date + retention period (per #780 lifecycle)                                                                                        | Brief §1, §4                |
| CA4 | **NO win-back hook / no sales pitch** — win-back is a separate touchpoint by design ("jamming a sales pitch into a cancel confirmation is hostile") | Brief §1, §4, Decisions log |
| CA5 | Trigger: user cancels via in-app or portal (`customer.subscription.updated`, `cancel_at_period_end` flips true; not account-deletion)               | Brief §1 / Eng §4.4         |

Notes:

- Shell-owned locks (G9–G12, G15, G16) were verified in PR 5.1 per the task scoping; they appear here for completeness but verification should target the shared shell, not re-verify per-template.
- WP5 flagged deliberately: the #783 brief locks "acknowledges the price paid" but does **not** state the dollar figures ($5/$2/$3) — those live in the #781 brief (`2026-06-24-monetization-tier-states-entitlements-design.md`), which was not in my allowed source list. Verification of exact prices should cite #781.
- Dunning, card_expiring_soon, gifting_ending_notice, winback rows omitted per scope (PR 5.3).
