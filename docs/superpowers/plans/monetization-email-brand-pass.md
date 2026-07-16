# Plan — #783 Monetization email brand pass

Spec/design: `design/design_handoff_monetization_emails/` (READINESS 🟢 Green)
Design property table: `docs/superpowers/design-tables/monetization-email-brand-pass.md`

## Goal

Rewrite the transactional lifecycle emails onto the new branded **dark** design:
a single inline-hex palette (`ME`, not per-user themed), shared atom + shell
primitives, and updated copy. Add `renewal_receipt_annual` ($50/yr) as an 11th
`EmailTemplateKey`.

## Tasks

- [x] Rewrite `palette.ts` + `layout.ts` foundation (dark `ME` palette, shells)
- [x] Rewrite `atoms.ts` (headerRow, ledeRow, callout, featureList, dataTable,
      amountHero, tierBadge, seatStamp, pricePromise, button, footerRow) —
      SVG icons render as styled Unicode glyphs (Gmail/Outlook strip `<svg>`)
- [x] Rewrite all 10 templates + add `renewal-receipt-annual.ts` via shared
      `receipt-core.ts`; wire `dunning-core.ts` for the dunning trio
- [x] Add `renewal_receipt_annual` to types, registry, test-fixtures, preview,
      schema, and `email_template_config` seed (migration `0048`)
- [x] Rewrite `templates.test.ts` against the atom `bodyRows` API + new copy;
      add annual receipt coverage. Quality gate: typecheck + lint + api/db tests
- [x] Design-review Agent 2 (verify) + gap report (HARD GATE before PR)
- [ ] releases.ts entry, progress.md row, env scan, PR (Closes #783), Copilot
      loop, CI
- [ ] Follow-up issue: annual billing pipeline (Stripe SKU + checkout + webhook)
      — OUT of #783 scope (template only)

## Next

Run design-review verify against the committed property table, write + commit
the gap report, then open the PR.
