# Hand-off: show status reports and contested prices (bugs and gaps)

Paste this into Claude Code in the concert-crawl repo. Designs: the "B+ prices and show status" page of the Design canvas https://claude.ai/artifact/N4JeHr2G9B3vC1gSHEFdMc (groups "Show status" and "Contested prices"). This prompt covers behavior fixes only; the restyle is a separate design handoff later.

---

Work in a worktree (`git worktree add .worktrees/fix/status-and-disputes -b fix/status-and-disputes`). Follow CLAUDE.md: one PR per item group below, a regression test for each defect, `pnpm typecheck` and `pnpm lint` before pushing, the pr-review skill, and copy-review for any copy change. Verify each item against the code before fixing it; these come from a read of the code, not from running it. If an item turns out not to be a bug, say so in the PR and skip it. Don't file issues; list anything left over as proposals for Hugh.

## 1. Defects (fix with regression tests)

1. **Disputed price card probably never renders.** Event detail looks up counters only against corroborated parents, but filing a counter flips the parent to `disputed`. So the lookup likely misses every open dispute and `DisputedPriceCard` never shows. Confirm, then query for parents in `disputed` (and keep the `needs-more-info` pill working).
2. **Pending report count is off by one.** `PendingReportBanner` shows `confirmsCount + 1` against the threshold. Decide whether the reporter counts toward the threshold (check the auto-promote logic) and make the banner match the server exactly.
3. **Watching maps `cancelled` to sold out.** A cancelled show you watch reads as sold out in Watching. Map each status to its own state.
4. **"Tickets available" does nothing.** The ReportSheet offers it when sold out is live, but picking it is a no-op. Wire it to a report that clears a promoted sold-out (same confirm threshold), or remove the option until it's built. Prefer wiring it.
5. **Confirm method isn't sent.** ConfirmReportSheet asks how you know, but the choice never reaches the server. Send and store it (expand-only migration if a column is needed).
6. **Counter tier and vendor are ignored.** CounterSubmitSheet asks for both and the server drops them. Lock them to the parent's tier and vendor in the UI and stop sending them.
7. **Raw 409 on a second report.** "You already have an unresolved report for this event" shows as a raw error. Catch it and show an Already reported state with "See your report" and "Withdraw" (design: "Already reported (new)").
8. **Dead buttons.** "Add evidence" on the reporter's pending banner and "Edit" on the reporter's pending sold-out card do nothing. Wire them or remove them.

## 2. Gaps (smaller features; one PR, copy-review the new strings)

- **Report filed state.** After "File report" there's no confirmation. Add the "Report filed." sheet (design: "Report filed (new)").
- **CTA on cancelled and postponed (Hugh decided).** Get Tickets still shows on both. Cancelled: replace it with "Refund info from the vendor", linking to the same ticket URL. Postponed: replace it with the Watch toggle ("Watching for the new date"). Sold out stays disabled.
- **Pending banner placement (Hugh decided).** Keep the pending status banner below the title and date, above the price block (where it renders today).
- **Sold out in rows.** Rows never show sold out. Add a Sold out chip (rows already strike through cancelled and label postponed).
- **Stale-sweep cancellations (Hugh decided).** `sweepStaleEvents` cancels shows missing for 14 days, notifies nobody, and looks identical to a fan-confirmed cancellation. Give sweep-removed shows their own state, shown as "No longer listed" (a grey chip with a dashed row and the line "The venue took this show down. It may be off."), never "Cancelled". Use an expand-only migration if it needs a new status value or a source column. Don't send cancellation notifications for it. Copy-review the new strings. Crawl behavior itself (when the sweep runs, the 14 days) doesn't change.

## 3. Out of scope: admin screens

Don't touch the admin review screens (price disputes or a status-report queue). Hugh plans to redesign the admin view after the user-facing work.
