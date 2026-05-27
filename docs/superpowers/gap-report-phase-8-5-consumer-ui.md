# Gap Report — Phase 8.5 Consumer UI

## IMPLEMENTED (88)

All 82 gaps identified by Agent 2, plus 6 additional gaps identified by Agent 3, have been fixed:

**PendingCardB** (18 gaps fixed)

- Strip left group: JetBrains Mono, font-weight 700, PendingDot elements, letter-spacing 0.04em
- Body: Eyebrow row, flex headline row with baseline alignment, PendingTrustPill, "face value · no fees" letter-spacing
- Vendor line: "seen on {vendor}" prefix
- Attribution: "Submitted by" prefix, conditional submitter element (you/link/anonymous), separator, timestamp
- Note block: margin-top 10px, color var(--fg-muted), letter-spacing, line-height 1.45, curly quotes
- Footer: margin-top 12px, padding-top 10px, border-top; flex space-between layout; CheckGlyph in confirm button; JetBrains Mono "Your submission" label; LockGlyph in waiting span; correct box-shadow for isBox

**CorroborationSheet** (11 gaps fixed)

- SubmissionDetailCard: padding 12px 14px, grid-template-columns auto 1fr
- VerifyOption label font-weight 700
- Self-locked: Edit button 13.5px + border-strong, Withdraw button 13.5px, footer gap 10, waiting notice gap 10
- Honesty disclaimer: Inter system-ui, 12px
- Header padding: 10px 16px 8px

**DisputedPriceCard** (6 gaps fixed)

- Strip gap 10, badge color var(--fg), removed extra "from" label, vendor line margin-top 6
- "Got a different number?" span: Inter 12px
- Submit button: ArrowGlyph size={11}, inline-flex

**CounterSubmitSheet** (3 gaps fixed)

- Ceiling hint text added
- Honesty disclaimer box added
- Footer disclaimer text added

**TierAlternateRow** (3 gaps fixed)

- Tier label color var(--fg), pending span font-weight 700 + letter-spacing 0.06em, live span letter-spacing -0.005em

**MultiTierLiveCard + MixedTierCard** (5 gaps each, 10 total fixed)

- Eyebrow "Tickets", flex headline row with baseline alignment, PendingTrustPill, vendor/observation line, Other tiers eyebrow letter-spacing

**ReportTypeMark** (4 gaps fixed)

- Glyph size 9×9, line-height 1, white-space nowrap, pending renders suffix span (not whole-badge opacity)

**ReportFooterLink** (4 gaps fixed)

- background/color/box-sizing on wrapper, letter-spacing on title/subtitle, footer caption uppercase

**ReportSheet** (5 gaps fixed)

- Correct SVG glyphs in option rows, selected border uses t.color, align-items flex-start, currently-live margin-bottom 14px, eyebrow letter-spacing 0.06em

**EvidenceForm** (5 gaps fixed)

- Warning border uses var(--border), exact warning SVG paths, input/textarea border-strong + border-radius 10px, textarea color var(--fg-subtle), footer caption added

**PendingSoldOutCard** (3 gaps fixed)

- Strip padding 8px 14px, body padding 14px 14px 12px, text-transform uppercase

**PendingReportBanner** (3 gaps fixed)

- Strip kind label: inline-flex JetBrains Mono bold glyph+text
- Attribution: inline-flex mono 9px
- Self-locked span: inline-flex, padding 7px 12px, margin-left auto, LockGlyph

**ConfirmReportSheet** (3 gaps fixed)

- Recap card padding 12px 14px, VerifyOption font-weight 700, caution note border + Inter + 12px

**LiveReportBanner** (2 gaps fixed)

- align-items center, gap 10px, sub-label letter-spacing 0.04em

**Agent 3 corrections** (6 gaps fixed)

- CorroborationSheet self-locked footer: gap 12→10
- CorroborationSheet fresh-state: added honesty disclaimer box (Inter, 12px, border var(--border), bg color-mix fg 3%)
- ModalShell mobile header padding: 0 18px 12px → 10px 16px 8px
- ModalShell desktop header padding: 18px 22px 12px → 10px 16px 8px
- ReportFooterLink bottom note: added textTransform uppercase
- EvidenceForm imminent warning border: color-mix → var(--border)

## GAPS (0)

None.

## DEFERRED (0)

None.
