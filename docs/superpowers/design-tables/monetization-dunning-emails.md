# Design Lock Table — Monetization Dunning/Reminder/Winback Emails (PR 5.3)

Sources: **[Brief]** = `docs/superpowers/specs/2026-06-27-monetization-emails-design.md` (#783), **[Eng §4/§5]** = `docs/superpowers/specs/2026-07-10-monetization-eng-infra-design-part-2.md`. G/M row numbering carries over from the PR 5.2 table (`docs/superpowers/design-tables/monetization-email-templates.md`).

## Global locks (carried over + new)

| ID  | Lock                                                                                                                                                               | Source                        |
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
| G13 | No CSS variables / token vocabulary — constrained inline palette: brand primary, neutral text gray, **warning amber for dunning**, success green for receipts      | Brief §5                      |
| G14 | Palette constants live in `apps/api/src/emails/palette.ts` (email-only palette)                                                                                    | Eng §4.2                      |
| G15 | Logo: PNG (not SVG), retina-tagged, CDN-hosted — **shell-owned** (verified PR 5.1)                                                                                 | Brief §5                      |
| G16 | Footer block: legal address + "manage emails" link → `/settings/notifications` — **shell-owned** (verified PR 5.1)                                                 | Brief §5                      |
| G17 | Default voice = Sour Patch Kids: slight cheek + honesty rail + warmth ("Sour Patch all the way down" — includes all 3 dunning emails)                              | Brief §4, Decisions inherited |
| G18 | No price escalation — dollar amounts honor the #782 price promise                                                                                                  | Brief, Decisions inherited    |
| G19 | Dunning voice rule: **no shame, no false urgency, never the word "fraud"** (per #782's voice rule) — applies across all 3 dunning templates                        | Brief §4                      |
| G20 | Dunning tone escalates **linearly** across the 3-email sequence: dunning_1 = "give it a refresh?", dunning_2 = "we're still trying", dunning_3 = "pauses tomorrow" | Brief §4                      |

## Module contract (carried over, applies to all 6 templates)

| ID  | Lock                                                                                                                                        | Source   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M1  | Location: `apps/api/src/emails/` — one module per template key                                                                              | Eng §4.2 |
| M2  | Each module exports per interface `RenderedEmail { subject: string; preheader: string; html: string; text: string }`                        | Eng §4.2 |
| M3  | Renderer shape: `TemplateRenderer<Vars> = (vars: Vars) => RenderedEmail` — pure/plain TS string-template functions                          | Eng §4.2 |
| M4  | No JSX email framework                                                                                                                      | Eng §4.2 |
| M5  | Copy strings live in the email modules themselves (not web `definitions/copy.ts` — that convention governs UI strings; emails are API-side) | Eng §4.2 |
| M6  | Sender: `billing@concertcrawl.app`, display name "Concert Crawl"; reply-to `support@concertcrawl.app`                                       | Eng §4.1 |

## Template: dunning_1_card_declined

| ID   | Lock                                                                                                                                                         | Source              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| D1-1 | Trigger: renewal charge fails, Day 0 — `invoice.payment_failed`, `attempt_count` 1                                                                           | Brief §1 / Eng §4.4 |
| D1-2 | Dedupe key: `invoice:{invoiceId}:attempt:{n}`                                                                                                                | Eng §4.4            |
| D1-3 | Voice tilt: casual + helpful; tone stage = "give it a refresh?"                                                                                              | Brief §1, §4        |
| D1-4 | Tone matches #782's failure surfaces — honest, not blamey                                                                                                    | Brief §1            |
| D1-5 | Single template w/ tier var                                                                                                                                  | Brief §1            |
| D1-6 | Primary CTA → Stripe portal                                                                                                                                  | Brief §1            |
| D1-7 | References the 7-day window                                                                                                                                  | Brief §1            |
| D1-8 | Example subject shape: `Your card got declined — give it a refresh?` (Design refines exact copy)                                                             | Brief §6            |
| D1-9 | Timing consistency: Smart Retries = 2 retries inside the 7-day window; Day 0 fail → dunning_1 (Stripe's own customer emails disabled — we own dunning voice) | Eng §5.2            |

## Template: dunning_2_still_declined

| ID   | Lock                                                                                | Source              |
| ---- | ----------------------------------------------------------------------------------- | ------------------- |
| D2-1 | Trigger: Stripe retry fails, Day 3–4 — `invoice.payment_failed`, `attempt_count` 2  | Brief §1 / Eng §4.4 |
| D2-2 | Dedupe key: `invoice:{invoiceId}:attempt:{n}`                                       | Eng §4.4            |
| D2-3 | Voice tilt: casual + slightly more urgent; tone stage = "we're still trying"        | Brief §1, §4        |
| D2-4 | Same shape as dunning_1, escalated tone                                             | Brief §1            |
| D2-5 | Locked copy phrase: "Heads up — we're still trying to get this through."            | Brief §1            |
| D2-6 | Single template w/ tier var                                                         | Brief §1            |
| D2-7 | Timing consistency: ~Day 3–4 retry fail → dunning_2 per Smart Retries configuration | Eng §5.2            |

## Template: dunning_3_final_warning

| ID   | Lock                                                                                                                                         | Source              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| D3-1 | Trigger: final retry fails, Day 7 — `invoice.payment_failed`, `attempt_count` ≥3                                                             | Brief §1 / Eng §4.4 |
| D3-2 | Dedupe key: `invoice:{invoiceId}:attempt:{n}`                                                                                                | Eng §4.4            |
| D3-3 | Voice tilt: honest + direct; tone stage = "pauses tomorrow"                                                                                  | Brief §1, §4        |
| D3-4 | Locked copy shape: "Your card hasn't cleared — `{tier_name}` pauses tomorrow if we can't get a fresh one."                                   | Brief §1            |
| D3-5 | No false urgency, no shame                                                                                                                   | Brief §1, §4        |
| D3-6 | Single template w/ tier var (uses `{tier_name}`)                                                                                             | Brief §1            |
| D3-7 | Timing consistency: Day 7 final fail → dunning_3, next-day cancellation → downgrade webhook — "pauses tomorrow" copy must match this reality | Eng §5.2            |

## Template: card_expiring_soon

| ID   | Lock                                                                                                                       | Source                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| CE-1 | Trigger: daily billing job (§5.1 task 1) fires at 30 / 14 / 7 days before card expiry (from Stripe customer card metadata) | Brief §1 / Eng §4.4, §5.1 |
| CE-2 | ONE template, THREE trigger windows — no per-window templates                                                              | Brief §1                  |
| CE-3 | Microcopy adjusts via `{days_remaining}` var                                                                               | Brief §1                  |
| CE-4 | Single template w/ tier var + days-remaining var                                                                           | Brief §1                  |
| CE-5 | Voice tilt: casual + helpful                                                                                               | Brief §1                  |
| CE-6 | Dedupe key: `{cardFingerprint}:{expMonth}-{expYear}:{window}` — one send per card per window                               | Eng §4.4                  |

## Template: gifting_ending_notice

| ID   | Lock                                                                                | Source              |
| ---- | ----------------------------------------------------------------------------------- | ------------------- |
| GE-1 | Trigger: gift expires in 7 days — daily job, `gifted_comps.expiresAt` within 7 days | Brief §1 / Eng §4.4 |
| GE-2 | Dedupe key: `gift:{giftId}`                                                         | Eng §4.4            |
| GE-3 | Voice tilt: casual + warm                                                           | Brief §1            |
| GE-4 | Single template (no tier var noted — gift templates are single-template)            | Brief §1            |
| GE-5 | Names the gifter                                                                    | Brief §1            |
| GE-6 | Names the end date                                                                  | Brief §1            |
| GE-7 | Primary CTA → convert to paid (Premium / Supporter / Founder picker)                | Brief §1            |
| GE-8 | This is the second and LAST gift-related template — no periodic check-in emails     | Brief §3            |

## Template: winback

| ID   | Lock                                                                                                                                                                                          | Source                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| WB-1 | Trigger: post-cancel — brief allows 30–90 days, #775/eng spec picks **day 60** (`cancel_completed` + no new sub), fired by daily job                                                          | Brief §1 / Eng §4.4                      |
| WB-2 | Single-shot per subscription; dedupe key: `sub:{subscriptionId}`                                                                                                                              | Eng §4.4                                 |
| WB-3 | Voice tilt: casual + lightly nostalgic                                                                                                                                                        | Brief §1                                 |
| WB-4 | **Basic shape only** — single hero copy block, single CTA                                                                                                                                     | Brief §1                                 |
| WB-5 | Single template w/ tier var                                                                                                                                                                   | Brief §1                                 |
| WB-6 | NOT a multi-stage sequence — multi-stage win-back is explicitly a separate future ticket ("borders on marketing")                                                                             | Brief §1, What's NOT in this brief       |
| WB-7 | Win-back is a separate touchpoint from cancellation_ack by design — no win-back content appears in the cancel confirmation, and vice-versa                                                    | Brief §1, §4                             |
| WB-8 | No discount offers: not specified anywhere in the brief; combined with G18 (no price escalation / price promise), pricing in winback must match the locked tier prices with no special offers | Brief §1 (absence) + Decisions inherited |

## Out of scope / deferred

- **Dunning escalation visual cue** (color shift? icon? messaging only?) — explicitly "Open for Design to call"; not a verifiable lock (Brief, Open for Design).
- **Win-back hook angle** (Denver-shows-you-missed vs. generic "we miss you" vs. new-tier-or-feature framing) — Design owns this call (Brief, Open for Design).
- **Per-template hero shape** (illustration vs. text-only) and **plain-text fallback structure** (pure prose vs. lightly structured headers) — Design owns (Brief, Open for Design).
- **`decline_code` → dunning template variable mapping** — #775 owns the mapping; the brief only locks the 3-email cadence shape. Templates should not hard-code decline-code copy from this brief (Brief, What's NOT in this brief).
- **Multi-stage win-back sequence** — future ticket (Brief).
- **Periodic gifted-user check-in emails** — skipped as out-of-scope marketing (Brief §3).
- **Marketing emails** (roundups/digests) and non-billing account notifications (#737) — separate tickets (Brief).
- **Exact dunning_2/dunning_3/card_expiring/gifting_ending/winback subject lines** — the brief gives a locked example only for dunning_1 (`Your card got declined — give it a refresh?`); all other subjects are Design-refined within G1–G6 constraints (Brief §6).

Notes:

- G-rows and M-rows are carried verbatim from the PR 5.2 table so IDs stay stable across both PRs; G19–G20 are new rows extracted from Brief §4's dunning-gradient paragraph (which the 5.2 table didn't need).
- Timing rows D1-9, D2-7, D3-7 are consistency constraints, not template features: the copy's stated timeline (7-day window, "pauses tomorrow") must agree with the Smart Retries configuration in Eng §5.2.
