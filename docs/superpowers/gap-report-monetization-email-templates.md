# Gap Report — PR 5.2 Email Templates (welcome/receipt/cancellation)

Design-review verification against `docs/superpowers/design-tables/monetization-email-templates.md` (lock table from #783 brief + eng infra spec §4).

## Result

**Visual/format/copy locks: 0 gaps.** All rows verified MATCH:

- Global G1–G8, G13, G14, G17, G18 ✅ (G9–G12, G15, G16 shell-owned, verified in PR 5.1 / #909)
- Module contract M1–M6 ✅
- welcome_paid WP1–WP11 ✅ (WP12 open-to-Design: badge shipped as uppercase eyebrow line; teaser carousel optional, not built)
- welcome_gifted WG1–WG7 ✅
- renewal_receipt_monthly RR1–RR10 ✅
- cancellation_ack CA1–CA5 ✅

Subject/preheader char counts machine-verified in range (subjects 38–49, preheaders 79–86). Prices and unlock lists cross-checked against #781 tier brief; 90-day retention cross-checked against #780.

## Out-of-scope finding (tracked, not a PR 5.2 gap)

- **WG8** — `welcome_gifted` is registered but no code path queues it. Its trigger is the admin gift-grant flow (`gifted_comps` insert), not a Stripe webhook, and no Phase 5 PR in the execution plan scopes that wiring. Tracked as a follow-up GitHub issue (see PR body). The other three templates' webhook triggers were wired in PR 5.1 and go live with this PR's registrations.

VERDICT: 0 in-scope gaps — ready for PR.
