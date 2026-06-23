# Admin Contest-Review — Design Property Table

Source-of-truth enumeration of every visual, interactive, and state claim for the admin contest-review surfaces (PriceDisputesQueue + per-event adjudication via AdminDisputePanel + sibling EventReports counterparts). Built from `design/design_handoff_phase8_5_corroboration/admin-queues.jsx` and `dispute-surfaces.jsx`. README is referenced for narrative context only — claims attribute to the JSX source.

Scope note: per the handoff README §11–12, the "contest-review" admin surfaces are PRICE disputes (`PriceDisputesQueue` + `AdminDisputePanel`) AND event-status reports (`EventReportsQueue` + `EventReportResolutionPanel`). Both are mirror-shape adjudication surfaces and are enumerated together below.

---

## 1. Top-level queue surface — PriceDisputesQueue

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| PriceDisputesQueue | default | container.fontFamily | `Inter, system-ui` | admin-queues.jsx:230 |
| PriceDisputesQueue | default | container.themeStyle | derived from `window.CC_THEMES[theme].tokens` mapped to `--{token}` CSS vars | admin-queues.jsx:226-228 |
| PriceDisputesQueue | empty (items.length === 0) | render | `return null` — auto-hides | admin-queues.jsx:225 |
| PriceDisputesQueue | header | title.text | `Price disputes` | admin-queues.jsx:234 |
| PriceDisputesQueue | header | title.fontWeight | `700` | admin-queues.jsx:233 |
| PriceDisputesQueue | header | title.fontSize | `14` | admin-queues.jsx:233 |
| PriceDisputesQueue | header | title.color | `var(--fg)` | admin-queues.jsx:233 |
| PriceDisputesQueue | header | count.badge.kind | `warning` (AdminStatusBadge) | admin-queues.jsx:236 |
| PriceDisputesQueue | header | count.badge.text | `{items.length} open` | admin-queues.jsx:236 |
| PriceDisputesQueue | header | count.badge.fg | `var(--warning)` | admin-queues.jsx:35 |
| PriceDisputesQueue | header | count.badge.bg | `color-mix(in oklab, var(--warning) 16%, transparent)` | admin-queues.jsx:35 |
| PriceDisputesQueue | header | count.badge.border | `1px solid color-mix(in oklab, var(--warning) 35%, transparent)` | admin-queues.jsx:35,49 |
| PriceDisputesQueue | header | count.badge.font | `'JetBrains Mono', monospace 9.5/700 uppercase letterSpacing 0.06em` | admin-queues.jsx:50-52 |
| PriceDisputesQueue | header | action.button1.text | `Sort: filed-at` | admin-queues.jsx:239 |
| PriceDisputesQueue | header | action.button1.variant | `ghost` (AdminBtn) | admin-queues.jsx:239 |
| PriceDisputesQueue | header | action.button2.text | `All disputes` | admin-queues.jsx:240 |
| PriceDisputesQueue | header | action.button2.variant | `ghost` (AdminBtn) | admin-queues.jsx:240 |
| PriceDisputesQueue | header | header.padding | `12px 16px` | admin-queues.jsx:71 |
| PriceDisputesQueue | header | header.layout | flex space-between, gap 12, align center | admin-queues.jsx:72-73 |
| PriceDisputesQueue | header | header.borderBottom | `1px solid var(--border)` | admin-queues.jsx:74 |
| PriceDisputesQueue | header | header.background | `var(--surface-1)` | admin-queues.jsx:75 |
| PriceDisputesQueue | panel | panel.background | `var(--bg-elevated, var(--bg))` | admin-queues.jsx:64 |
| PriceDisputesQueue | panel | panel.border | `1px solid var(--border)` | admin-queues.jsx:65 |
| PriceDisputesQueue | panel | panel.borderRadius | `12` | admin-queues.jsx:66 |
| PriceDisputesQueue | panel | panel.overflow | `hidden` | admin-queues.jsx:67 |
| PriceDisputesQueue | table | columns | `Event`, `Original`, `Counter`, `Filed`, [actions, width 120, no header] | admin-queues.jsx:246-250 |
| PriceDisputesQueue | table | th.padding | `10px 14px` | admin-queues.jsx:123 |
| PriceDisputesQueue | table | th.font | `'JetBrains Mono', monospace 9.5 uppercase letterSpacing 0.08em weight 700` | admin-queues.jsx:124-126 |
| PriceDisputesQueue | table | th.color | `var(--fg-subtle)` | admin-queues.jsx:125 |
| PriceDisputesQueue | table | th.borderBottom | `1px solid var(--border)` | admin-queues.jsx:127 |
| PriceDisputesQueue | table | th.background | `var(--surface-1)` | admin-queues.jsx:128 |
| PriceDisputesQueue | table | td.padding | `12px 14px` | admin-queues.jsx:135 |
| PriceDisputesQueue | table | td.font | `Inter, system-ui 13` | admin-queues.jsx:138 |
| PriceDisputesQueue | table | td.color.default | `var(--fg)` | admin-queues.jsx:137 |
| PriceDisputesQueue | table | td.borderBottom | `1px solid var(--border)` | admin-queues.jsx:139 |
| PriceDisputesQueue | table | row.layout | `<tr>` per dispute item, keyed by `row.id` | admin-queues.jsx:254-255 |
| PriceDisputesQueue | loading state | claim | NOT SPECIFIED in design | (absent) |
| PriceDisputesQueue | error state | claim | NOT SPECIFIED in design | (absent) |

## 2. Row / list-item surface — PriceDisputesQueue row

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| PriceDisputesQueue.row | default | event.cell.title.text | `{row.artist}` | admin-queues.jsx:258 |
| PriceDisputesQueue.row | default | event.cell.title.fontWeight | `700` | admin-queues.jsx:257 |
| PriceDisputesQueue.row | default | event.cell.title.fontSize | `13.5` | admin-queues.jsx:257 |
| PriceDisputesQueue.row | default | event.cell.title.color | `var(--fg)` | admin-queues.jsx:257 |
| PriceDisputesQueue.row | default | event.cell.subtitle.text | `{row.venue} · {row.date}` | admin-queues.jsx:264 |
| PriceDisputesQueue.row | default | event.cell.subtitle.font | `'JetBrains Mono', monospace 10 letterSpacing 0.04em` | admin-queues.jsx:261-262 |
| PriceDisputesQueue.row | default | event.cell.subtitle.color | `var(--fg-subtle)` | admin-queues.jsx:262 |
| PriceDisputesQueue.row | default | event.cell.subtitle.marginTop | `2` | admin-queues.jsx:263 |
| PriceDisputesQueue.row | default | original.cell.price.format | `$floor–$ceiling` if ceiling > floor, else `$floor` | admin-queues.jsx:205-207 |
| PriceDisputesQueue.row | default | original.cell.price.font | `Inter, system-ui 14/700 tabular-nums letterSpacing -0.01em` | admin-queues.jsx:210-213 |
| PriceDisputesQueue.row | default | original.cell.price.color | `var(--fg)` | admin-queues.jsx:211 |
| PriceDisputesQueue.row | original.kind === "boxoffice" | original.cell.badge.kind | `gold` (AdminStatusBadge) | admin-queues.jsx:269 |
| PriceDisputesQueue.row | original.kind === "boxoffice" | original.cell.badge.text | `box office` | admin-queues.jsx:269 |
| PriceDisputesQueue.row | original.kind === "boxoffice" | original.cell.badge.fg | `oklch(0.66 0.14 78)` (GOLD_Q) | admin-queues.jsx:29,41 |
| PriceDisputesQueue.row | original.kind === "boxoffice" | original.cell.badge.bg | `color-mix(in oklab, GOLD_Q 18%, transparent)` | admin-queues.jsx:41 |
| PriceDisputesQueue.row | default | original.cell.attribution.text | `{row.original.submitter} · {row.original.confirms} confirms` | admin-queues.jsx:275 |
| PriceDisputesQueue.row | default | original.cell.attribution.font | `'JetBrains Mono', monospace 9.5 letterSpacing 0.04em` | admin-queues.jsx:273-274 |
| PriceDisputesQueue.row | default | original.cell.attribution.color | `var(--fg-muted)` | admin-queues.jsx:274 |
| PriceDisputesQueue.row | default | original.cell.attribution.marginTop | `4` | admin-queues.jsx:272 |
| PriceDisputesQueue.row | default | counter.cell.price.format | same as original price format | admin-queues.jsx:279 |
| PriceDisputesQueue.row | default | counter.cell.badge.kind | `azure` (AdminStatusBadge) | admin-queues.jsx:280 |
| PriceDisputesQueue.row | default | counter.cell.badge.text | `pending` | admin-queues.jsx:280 |
| PriceDisputesQueue.row | default | counter.cell.badge.fg | `oklch(0.62 0.12 240)` (AZ_Q) | admin-queues.jsx:28,40 |
| PriceDisputesQueue.row | default | counter.cell.badge.bg | `color-mix(in oklab, AZ_Q 16%, transparent)` | admin-queues.jsx:40 |
| PriceDisputesQueue.row | default | counter.cell.attribution.text | `{row.counter.submitter} · {row.counter.confirms} confirms` | admin-queues.jsx:286 |
| PriceDisputesQueue.row | default | filed.cell.text | `{row.filedAt}` (e.g. `1h ago`, `6h ago`, `2d ago`) | admin-queues.jsx:292,152,159,166 |
| PriceDisputesQueue.row | default | filed.cell.font | `'JetBrains Mono', monospace 10 letterSpacing 0.04em` | admin-queues.jsx:290-291 |
| PriceDisputesQueue.row | default | filed.cell.color | `var(--fg-muted)` | admin-queues.jsx:291 |
| PriceDisputesQueue.row | default | action.cell.alignment | right | admin-queues.jsx:294 |
| PriceDisputesQueue.row | default | action.cell.button.text | `Resolve →` | admin-queues.jsx:295 |
| PriceDisputesQueue.row | default | action.cell.button.variant | `outline` (AdminBtn) | admin-queues.jsx:295 |
| PriceDisputesQueue.row | default | action.cell.button.bg | `transparent` | admin-queues.jsx:91 |
| PriceDisputesQueue.row | default | action.cell.button.fg | `var(--fg)` | admin-queues.jsx:91 |
| PriceDisputesQueue.row | default | action.cell.button.border | `1px solid var(--border-strong)` | admin-queues.jsx:91 |
| PriceDisputesQueue.row | default | action.cell.button.height | `28` | admin-queues.jsx:88 |
| PriceDisputesQueue.row | default | action.cell.button.padding | `0 10px` | admin-queues.jsx:88 |
| PriceDisputesQueue.row | default | action.cell.button.borderRadius | `7` | admin-queues.jsx:103 |
| PriceDisputesQueue.row | default | action.cell.button.font | `Inter, system-ui 12/600 letterSpacing -0.005em` | admin-queues.jsx:88,105-106 |
| PriceDisputesQueue.row | hover/active states | claim | NOT SPECIFIED in design | (absent) |
| PriceDisputesQueue.row | click target scope | claim | only the `Resolve →` button has `onClick`; the row itself has no click handler | admin-queues.jsx:295,100 |

## 3. Per-event adjudication surface — AdminDisputePanel (price)

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| AdminDisputePanel | default | width | `760` | dispute-surfaces.jsx:746 |
| AdminDisputePanel | default | padding | `24` | dispute-surfaces.jsx:746 |
| AdminDisputePanel | default | background | `var(--bg)` | dispute-surfaces.jsx:747 |
| AdminDisputePanel | default | color | `var(--fg)` | dispute-surfaces.jsx:747 |
| AdminDisputePanel | default | fontFamily | `Inter, system-ui, sans-serif` | dispute-surfaces.jsx:748 |
| AdminDisputePanel | default | borderRadius | `14` | dispute-surfaces.jsx:750 |
| AdminDisputePanel | default | border | `1px solid var(--border)` | dispute-surfaces.jsx:751 |
| AdminDisputePanel | default | themeStyle | derived from `window.CC_THEMES[theme].tokens` (default `theme="electric"`) | dispute-surfaces.jsx:739-742 |
| AdminDisputePanel | header | eyebrow.text | `Disputes · Phase 8.5` | dispute-surfaces.jsx:762 |
| AdminDisputePanel | header | eyebrow.font | `'JetBrains Mono', monospace 9.5 uppercase letterSpacing 0.08em` | dispute-surfaces.jsx:759-761 |
| AdminDisputePanel | header | eyebrow.color | `var(--fg-subtle)` | dispute-surfaces.jsx:760 |
| AdminDisputePanel | header | title.text | `Electric Callboy · Mission Ballroom · Aug 30` (sample data; structure: `{artist} · {venue} · {date}`) | dispute-surfaces.jsx:767 |
| AdminDisputePanel | header | title.font | `Inter, system-ui 22/900 letterSpacing -0.025em` | dispute-surfaces.jsx:765-766 |
| AdminDisputePanel | header | title.color | `var(--fg)` | dispute-surfaces.jsx:766 |
| AdminDisputePanel | header | status.pill.text | `open dispute` | dispute-surfaces.jsx:775 |
| AdminDisputePanel | header | status.pill.bg | `color-mix(in oklab, var(--warning) 16%, transparent)` | dispute-surfaces.jsx:771 |
| AdminDisputePanel | header | status.pill.fg | `var(--warning)` | dispute-surfaces.jsx:772 |
| AdminDisputePanel | header | status.pill.padding | `5px 10px` | dispute-surfaces.jsx:770 |
| AdminDisputePanel | header | status.pill.borderRadius | `999` | dispute-surfaces.jsx:770 |
| AdminDisputePanel | header | status.pill.font | `'JetBrains Mono', monospace 10/700 uppercase letterSpacing 0.06em` | dispute-surfaces.jsx:773-774 |
| AdminDisputePanel | guidance | text | `A corroborated price is being challenged. Pick the number that should live on the event page. Either entry can be promoted; the loser is archived (not deleted) with a reason. The submitter is not penalized — disputes are updates, not violations.` | dispute-surfaces.jsx:788-792 |
| AdminDisputePanel | guidance | bg | `color-mix(in oklab, var(--fg) 4%, transparent)` | dispute-surfaces.jsx:780 |
| AdminDisputePanel | guidance | border | `1px solid var(--border)` | dispute-surfaces.jsx:781 |
| AdminDisputePanel | guidance | borderRadius | `10` | dispute-surfaces.jsx:782 |
| AdminDisputePanel | guidance | padding | `10px 14px` | dispute-surfaces.jsx:779 |
| AdminDisputePanel | guidance | font | `Inter, system-ui 13 lineHeight 1.5 letterSpacing -0.005em` | dispute-surfaces.jsx:783-786 |
| AdminDisputePanel | guidance | color | `var(--fg-muted)` | dispute-surfaces.jsx:784 |
| AdminDisputePanel | layout | two-up.grid | `gridTemplateColumns: "1fr 16px 1fr"` | dispute-surfaces.jsx:795-796 |
| AdminDisputePanel | layout | two-up.alignItems | `start` | dispute-surfaces.jsx:797 |
| AdminDisputePanel | layout | two-up.marginBottom | `18` | dispute-surfaces.jsx:798 |
| AdminDisputePanel | original column | label.text | `Original · live` | dispute-surfaces.jsx:805 |
| AdminDisputePanel | original column | label.font | `'JetBrains Mono', monospace 9.5 uppercase letterSpacing 0.08em` | dispute-surfaces.jsx:802-803 |
| AdminDisputePanel | original column | label.marginBottom | `8` | dispute-surfaces.jsx:804 |
| AdminDisputePanel | original column | entry.floor | `48` (sample) | dispute-surfaces.jsx:807 |
| AdminDisputePanel | original column | entry.ceiling | `58` (sample) | dispute-surfaces.jsx:807 |
| AdminDisputePanel | original column | entry.tier | `GA` (sample) | dispute-surfaces.jsx:807 |
| AdminDisputePanel | original column | entry.vendor | `AXS` (sample) | dispute-surfaces.jsx:807 |
| AdminDisputePanel | original column | entry.submitter | `{handle: "@hugh"}` (sample) | dispute-surfaces.jsx:808 |
| AdminDisputePanel | original column | entry.observedAt | `2d ago` (sample) | dispute-surfaces.jsx:809 |
| AdminDisputePanel | original column | entry.confirms | `2 fans · 0 admin` (sample) | dispute-surfaces.jsx:809 |
| AdminDisputePanel | original column | entry.note | `GA standing, checked the cart on AXS.` (sample) | dispute-surfaces.jsx:810 |
| AdminDisputePanel | original column | entry.winner | `"this"` when `winner === "original"`, else `null` | dispute-surfaces.jsx:811 |
| AdminDisputePanel | vs divider | text | `vs` | dispute-surfaces.jsx:820 |
| AdminDisputePanel | vs divider | font | `'JetBrains Mono', monospace 11 uppercase letterSpacing 0.06em` | dispute-surfaces.jsx:817-819 |
| AdminDisputePanel | vs divider | color | `var(--fg-subtle)` | dispute-surfaces.jsx:818 |
| AdminDisputePanel | vs divider | layout | flex center, alignSelf stretch | dispute-surfaces.jsx:815-816 |
| AdminDisputePanel | counter column | label.text | `Counter · pending` | dispute-surfaces.jsx:826 |
| AdminDisputePanel | counter column | entry.floor | `65` (sample) | dispute-surfaces.jsx:828 |
| AdminDisputePanel | counter column | entry.ceiling | `80` (sample) | dispute-surfaces.jsx:828 |
| AdminDisputePanel | counter column | entry.tier | `GA` (sample) | dispute-surfaces.jsx:828 |
| AdminDisputePanel | counter column | entry.vendor | `AXS` (sample) | dispute-surfaces.jsx:828 |
| AdminDisputePanel | counter column | entry.submitter | `{handle: "@kel"}` (sample) | dispute-surfaces.jsx:829 |
| AdminDisputePanel | counter column | entry.observedAt | `1h ago` (sample) | dispute-surfaces.jsx:830 |
| AdminDisputePanel | counter column | entry.confirms | `0 fans` (sample) | dispute-surfaces.jsx:830 |
| AdminDisputePanel | counter column | entry.note | `Same vendor — face moved to $65 after openers were announced. Cart is now showing $80 with fees.` (sample) | dispute-surfaces.jsx:831 |
| AdminDisputePanel | counter column | entry.winner | `"this"` when `winner === "counter"`, else `null` | dispute-surfaces.jsx:832 |
| AdminDisputePanel | reason field | eyebrow.label | `Reason (shown to both submitters)` | dispute-surfaces.jsx:838 |
| AdminDisputePanel | reason field | input.bg | `var(--surface-1)` | dispute-surfaces.jsx:841 |
| AdminDisputePanel | reason field | input.border | `1px solid var(--border-strong)` | dispute-surfaces.jsx:842 |
| AdminDisputePanel | reason field | input.borderRadius | `10` | dispute-surfaces.jsx:843 |
| AdminDisputePanel | reason field | input.padding | `10px 12px` | dispute-surfaces.jsx:840 |
| AdminDisputePanel | reason field | input.font | `Inter, system-ui 13 letterSpacing -0.005em` | dispute-surfaces.jsx:844-845 |
| AdminDisputePanel | reason field | input.color | `var(--fg)` | dispute-surfaces.jsx:845 |
| AdminDisputePanel | reason field | input.minHeight | `44` | dispute-surfaces.jsx:846 |
| AdminDisputePanel | reason field | input.sample.text | `Confirmed with AXS — face moved to $65 after openers were announced. Hugh's $48 was correct at the time of submission; keeping his entry archived for history.` | dispute-surfaces.jsx:848 |
| AdminDisputePanel | reason field | input.disclosure | Reason is shown to both submitters (per eyebrow + README §5) | dispute-surfaces.jsx:838,README:195 |
| AdminDisputePanel | actions | layout | flex, gap 10, justifyContent flex-end | dispute-surfaces.jsx:852-853 |
| AdminDisputePanel | actions | needMoreInfo.text | `Need more info` | dispute-surfaces.jsx:862 |
| AdminDisputePanel | actions | needMoreInfo.bg | `transparent` | dispute-surfaces.jsx:858 |
| AdminDisputePanel | actions | needMoreInfo.border | `1px solid var(--border-strong)` | dispute-surfaces.jsx:859 |
| AdminDisputePanel | actions | needMoreInfo.color | `var(--fg-muted)` | dispute-surfaces.jsx:861 |
| AdminDisputePanel | actions | needMoreInfo.font | `Inter, system-ui 13/600 letterSpacing -0.005em` | dispute-surfaces.jsx:860-861 |
| AdminDisputePanel | actions | needMoreInfo.padding | `10px 16px` | dispute-surfaces.jsx:857 |
| AdminDisputePanel | actions | needMoreInfo.borderRadius | `9` | dispute-surfaces.jsx:857 |
| AdminDisputePanel | actions | keepOriginal.text | `Keep original` | dispute-surfaces.jsx:870 |
| AdminDisputePanel | actions | keepOriginal.bg | `transparent` | dispute-surfaces.jsx:866 |
| AdminDisputePanel | actions | keepOriginal.border | `1px solid GOLD_D` = `1px solid oklch(0.66 0.14 78)` | dispute-surfaces.jsx:22,867 |
| AdminDisputePanel | actions | keepOriginal.color | `GOLD_D` = `oklch(0.66 0.14 78)` | dispute-surfaces.jsx:22,869 |
| AdminDisputePanel | actions | keepOriginal.font | `Inter, system-ui 13/700 letterSpacing -0.005em` | dispute-surfaces.jsx:868-869 |
| AdminDisputePanel | actions | promoteCounter.text | `Promote counter` | dispute-surfaces.jsx:877 |
| AdminDisputePanel | actions | promoteCounter.bg | `AZ_D` = `oklch(0.62 0.12 240)` | dispute-surfaces.jsx:21,874 |
| AdminDisputePanel | actions | promoteCounter.color | `var(--fg-on-accent)` | dispute-surfaces.jsx:874 |
| AdminDisputePanel | actions | promoteCounter.font | `Inter, system-ui 13/800 letterSpacing -0.005em` | dispute-surfaces.jsx:875-876 |
| AdminDisputePanel | actions | promoteCounter.padding | `10px 16px` | dispute-surfaces.jsx:872 |
| AdminDisputePanel | actions | promoteCounter.borderRadius | `9` | dispute-surfaces.jsx:872 |
| AdminDisputePanel | adjudication semantics | promoteCounter.effect | counter goes live; original is archived with reason; submitter not penalized | dispute-surfaces.jsx:788-792,README:189,195,197 |
| AdminDisputePanel | adjudication semantics | keepOriginal.effect | implicit: original stays live, counter archived (mirror of promoteCounter wording) | dispute-surfaces.jsx:788-792 (implied) |
| AdminDisputePanel | adjudication semantics | archived.semantics | "archived (not deleted) with a reason" | dispute-surfaces.jsx:790-791 |
| AdminDisputePanel | adjudication semantics | submitter.penalty | none — "submitter is not penalized — disputes are updates, not violations" | dispute-surfaces.jsx:790-792 |
| AdminDisputePanel | success state | claim | NOT SPECIFIED in design (no post-action surface shown) | (absent) |
| AdminDisputePanel | error state | claim | NOT SPECIFIED in design | (absent) |

## 3b. AdminEntry (sub-component of AdminDisputePanel)

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| AdminEntry | default | padding | `14px 16px` | dispute-surfaces.jsx:677 |
| AdminEntry | default | background | `var(--surface-1)` | dispute-surfaces.jsx:678 |
| AdminEntry | default (not winner) | border | `1px solid var(--border)` | dispute-surfaces.jsx:679 |
| AdminEntry | winner | border | `2px solid AZ_D` = `2px solid oklch(0.62 0.12 240)` | dispute-surfaces.jsx:679 |
| AdminEntry | winner | badge.text | `winner` | dispute-surfaces.jsx:691 |
| AdminEntry | winner | badge.position | absolute, top -10, left 12 | dispute-surfaces.jsx:685-686 |
| AdminEntry | winner | badge.padding | `3px 8px` | dispute-surfaces.jsx:686 |
| AdminEntry | winner | badge.bg | `AZ_D` = `oklch(0.62 0.12 240)` | dispute-surfaces.jsx:687 |
| AdminEntry | winner | badge.color | `var(--fg-on-accent)` | dispute-surfaces.jsx:687 |
| AdminEntry | winner | badge.font | `'JetBrains Mono', monospace 9/700 uppercase letterSpacing 0.08em` | dispute-surfaces.jsx:688-689 |
| AdminEntry | winner | badge.borderRadius | `4` | dispute-surfaces.jsx:690 |
| AdminEntry | default | price.format | `FormatRange(floor, ceiling)` (window.PendingFormatRange) | dispute-surfaces.jsx:28,699 |
| AdminEntry | default | price.font | `Inter, system-ui 30/800 letterSpacing -0.025em lineHeight 1` | dispute-surfaces.jsx:696-698 |
| AdminEntry | default | price.color | `var(--fg)` | dispute-surfaces.jsx:697 |
| AdminEntry | default | tier.text | `{tier}` | dispute-surfaces.jsx:704 |
| AdminEntry | default | tier.font | `'JetBrains Mono', monospace 11/700 uppercase letterSpacing 0.06em` | dispute-surfaces.jsx:701-703 |
| AdminEntry | default | tier.color | `var(--fg-muted)` | dispute-surfaces.jsx:702 |
| AdminEntry | default | trustPill.component | `window.PendingTrustPill` with `kind` prop | dispute-surfaces.jsx:705 |
| AdminEntry | metadata | grid | `gridTemplateColumns: "auto 1fr"`, gap `4px 12px` | dispute-surfaces.jsx:710-711 |
| AdminEntry | metadata | font | `'JetBrains Mono', monospace 9.5 letterSpacing 0.04em` | dispute-surfaces.jsx:712-713 |
| AdminEntry | metadata.submitter | label | `Submitter` (uppercase, `var(--fg-subtle)`) | dispute-surfaces.jsx:715 |
| AdminEntry | metadata.submitter | value | `{submitter.handle}` (`var(--fg)`) | dispute-surfaces.jsx:716 |
| AdminEntry | metadata.vendor | label | `Vendor` | dispute-surfaces.jsx:717 |
| AdminEntry | metadata.vendor | value | `{vendor}` | dispute-surfaces.jsx:718 |
| AdminEntry | metadata.observed | label | `Observed` | dispute-surfaces.jsx:719 |
| AdminEntry | metadata.observed | value | `{observedAt}` | dispute-surfaces.jsx:720 |
| AdminEntry | metadata.confirms | label | `Confirms` | dispute-surfaces.jsx:721 |
| AdminEntry | metadata.confirms | value | `{confirms}` (free-form string, e.g. `2 fans · 0 admin` or `0 fans`) | dispute-surfaces.jsx:722,809,830 |
| AdminEntry | note present | note.bg | `color-mix(in oklab, var(--fg) 4%, transparent)` | dispute-surfaces.jsx:727 |
| AdminEntry | note present | note.border | `1px solid var(--border)` | dispute-surfaces.jsx:728 |
| AdminEntry | note present | note.borderRadius | `8` | dispute-surfaces.jsx:729 |
| AdminEntry | note present | note.padding | `8px 10px` | dispute-surfaces.jsx:726 |
| AdminEntry | note present | note.format | quoted: `"{note}"` | dispute-surfaces.jsx:733 |
| AdminEntry | note present | note.font | `Inter, system-ui 12.5 italic lineHeight 1.45 letterSpacing -0.005em` | dispute-surfaces.jsx:730-732 |
| AdminEntry | note present | note.color | `var(--fg-muted)` | dispute-surfaces.jsx:731 |
| AdminEntry | note absent | render | block omitted entirely | dispute-surfaces.jsx:724 |

## 4. State transitions — adjudication semantics

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| AdminDisputePanel | promote counter | transition.counter | counter goes live | dispute-surfaces.jsx:788-789,README:189,195 |
| AdminDisputePanel | promote counter | transition.original | original is archived (not deleted) with reason | dispute-surfaces.jsx:790-791,README:197 |
| AdminDisputePanel | promote counter | transition.atomicity | "If it lands first, the original is auto-archived" (counter-submit normal path) — atomicity for admin promotion NOT explicitly stated | README:189 (see Ambiguities) |
| AdminDisputePanel | promote counter | transition.penalty | none — submitters not penalized | dispute-surfaces.jsx:790-792,README:189,197 |
| AdminDisputePanel | keep original | transition.original | stays live | implied: dispute-surfaces.jsx:788-792 |
| AdminDisputePanel | keep original | transition.counter | archived with reason (mirror of promote-counter) | implied: dispute-surfaces.jsx:788-792 |
| AdminDisputePanel | need more info | transition | NOT SPECIFIED — likely defers without resolving | dispute-surfaces.jsx:862 (label only) |
| AdminDisputePanel | reason field | propagation | reason "shown to both submitters" | dispute-surfaces.jsx:838,README:195 |
| AdminDisputePanel | navigation/redirect | claim | NOT SPECIFIED in design | (absent) |
| AdminDisputePanel | audit log | claim | NOT SPECIFIED in design (likely implied via existing admin audit pattern) | (absent) |
| Counter-submit normal path | non-admin flow | counter lands at 2 confirms | original auto-archived with reason "superseded by counter" | README:189 |
| Counter-submit normal path | atomicity | claim | "One transaction" claimed for event-report counter-promotion; price-side not stated explicitly | README:337 (event reports only) |

## 5. Data dependencies — what must be fetched / displayed

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| PriceDisputesQueue | data | items[].id | string id (used as React key) | admin-queues.jsx:148,255 |
| PriceDisputesQueue | data | items[].artist | string | admin-queues.jsx:149,258 |
| PriceDisputesQueue | data | items[].venue | string | admin-queues.jsx:149,264 |
| PriceDisputesQueue | data | items[].date | string (display format, e.g. `Aug 30`) | admin-queues.jsx:149,264 |
| PriceDisputesQueue | data | items[].original.floor | number | admin-queues.jsx:150,205 |
| PriceDisputesQueue | data | items[].original.ceiling | number \| null | admin-queues.jsx:150,205 |
| PriceDisputesQueue | data | items[].original.submitter | string handle (e.g. `@hugh`, `anonymous`) | admin-queues.jsx:150,164,275 |
| PriceDisputesQueue | data | items[].original.confirms | number | admin-queues.jsx:150,275 |
| PriceDisputesQueue | data | items[].original.kind | `"community"` (implicit default) \| `"boxoffice"` | admin-queues.jsx:157,269 |
| PriceDisputesQueue | data | items[].counter.floor | number | admin-queues.jsx:151,279 |
| PriceDisputesQueue | data | items[].counter.ceiling | number \| null | admin-queues.jsx:151,279 |
| PriceDisputesQueue | data | items[].counter.submitter | string handle | admin-queues.jsx:151,286 |
| PriceDisputesQueue | data | items[].counter.confirms | number | admin-queues.jsx:151,286 |
| PriceDisputesQueue | data | items[].counter.kind | optional (`"community"` default) | admin-queues.jsx:158 |
| PriceDisputesQueue | data | items[].filedAt | string (relative, e.g. `1h ago`) | admin-queues.jsx:152,292 |
| PriceDisputesQueue | data | drill-target | `Resolve →` button opens `AdminDisputePanel` for the event | admin-queues.jsx:295,README:39,193 |
| AdminDisputePanel | data | event.artist | string | dispute-surfaces.jsx:767 |
| AdminDisputePanel | data | event.venue | string | dispute-surfaces.jsx:767 |
| AdminDisputePanel | data | event.date | string (display format) | dispute-surfaces.jsx:767 |
| AdminDisputePanel | data | original.floor + ceiling + tier + vendor | full Phase 8 submission shape | dispute-surfaces.jsx:807,README:51,195 |
| AdminDisputePanel | data | original.submitter.handle | string | dispute-surfaces.jsx:808,716 |
| AdminDisputePanel | data | original.observedAt | string (relative time) | dispute-surfaces.jsx:809,720 |
| AdminDisputePanel | data | original.confirms | string summary (e.g. `2 fans · 0 admin`) | dispute-surfaces.jsx:809,722 |
| AdminDisputePanel | data | original.note | string \| null | dispute-surfaces.jsx:810,724 |
| AdminDisputePanel | data | original.kind | for `PendingTrustPill` (community/boxoffice) | dispute-surfaces.jsx:671,705 |
| AdminDisputePanel | data | counter.* | same shape as original | dispute-surfaces.jsx:828-831 |
| AdminDisputePanel | data | winner | `"original"` \| `"counter"` \| `null` (preview/decision state) | dispute-surfaces.jsx:739,811,832 |
| AdminDisputePanel | data | reason | string written by admin, persisted, shown to both submitters | dispute-surfaces.jsx:838,847-849 |
| AdminDisputePanel | drill-targets | submitter.handle | NOT specified as clickable (rendered as plain text, no anchor) | dispute-surfaces.jsx:716 |
| AdminDisputePanel | drill-targets | event.title | NOT specified as clickable (rendered as `<h2>`) | dispute-surfaces.jsx:763-768 |

## 6. Edge cases — explicit + implicit

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| AdminDisputePanel | parent already resolved | claim | NOT SPECIFIED — design assumes adjudication is still open (`open dispute` pill) | dispute-surfaces.jsx:775 (see Ambiguities) |
| AdminDisputePanel | parent already disputed by another challenger | claim | NOT SPECIFIED — design shows only a single counter slot | dispute-surfaces.jsx:794-836 (see Ambiguities) |
| AdminDisputePanel | challenger withdrawn | claim | NOT SPECIFIED in admin panel; submitter `Withdraw` exists in CorroborationSheet self-locked state but no admin-side surface | dispute-surfaces.jsx:311-319 (consumer only) (see Ambiguities) |
| AdminDisputePanel | both parties withdrawn | claim | NOT SPECIFIED | (absent) (see Ambiguities) |
| Counter-submit (non-admin path) | counter lands first (2 confirms) | original auto-archive | `auto-archived with a "superseded by counter" reason` — no admin intervention needed | README:189 |
| Counter-submit (non-admin path) | counter stalls | admin route | falls into `PriceDisputesQueue` for admin resolution ("Without this, a counter-submission that doesn't reach 2 fan confirms sits in limbo forever") | README:39 |
| PriceDisputesQueue | items omitted (default) | data fallback | `items = PRICE_DISPUTES` (in-file sample) — production must pass real data | admin-queues.jsx:224 |

## 7. Accessibility / mobile / keyboard

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| PriceDisputesQueue | mobile | claim | NOT SPECIFIED — designs are desktop admin chrome (README §9 says "Desktop layout for the new surfaces" is out of scope for consumer; admin queues implicitly desktop) | README:381 (see Ambiguities) |
| AdminDisputePanel | mobile | claim | NOT SPECIFIED; fixed `width: 760` | dispute-surfaces.jsx:746 (see Ambiguities) |
| AdminBtn | keyboard | onClick.preventDefault | All inline `onClick` handlers call `e.preventDefault()` (design demo wiring; not production behavior) | admin-queues.jsx:100,358; dispute-surfaces.jsx:855,863,871 |
| AdminBtn | semantics | element | native `<button>` with `all: "unset"` styles | admin-queues.jsx:100-107 |
| AdminBtn | ARIA roles | claim | NOT SPECIFIED | (absent) (see Ambiguities) |
| AdminTBL | semantics | element | native `<table>/<thead>/<tbody>/<tr>/<th>/<td>` | admin-queues.jsx:112-143 |
| AdminTBL | sort / filter accessibility | claim | NOT SPECIFIED — filter chips on EventReportsQueue are buttons but no aria-pressed | admin-queues.jsx:358 (see Ambiguities) |
| AdminDisputePanel | focus order | claim | NOT SPECIFIED | (absent) (see Ambiguities) |

---

## 8. Sibling: EventReportsQueue + EventReportResolutionPanel (status reports)

These mirror the price-dispute surfaces and are part of the contest-review scope per README §12. Enumerated for parity.

### 8a. EventReportsQueue top-level

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| EventReportsQueue | empty (items.length === 0) | render | `return null` — auto-hides | admin-queues.jsx:321 |
| EventReportsQueue | header | title.text | `Event status reports` | admin-queues.jsx:338 |
| EventReportsQueue | header | count.badge.kind | `warning` | admin-queues.jsx:340 |
| EventReportsQueue | header | count.badge.text | `{items.length} pending` | admin-queues.jsx:340 |
| EventReportsQueue | header | action.button1.text | `Sort: filed-at` | admin-queues.jsx:343 |
| EventReportsQueue | header | action.button2.text | `All reports` | admin-queues.jsx:344 |
| EventReportsQueue | filters | options | `all`, `soldout`, `cancelled`, `postponed` (labels: `All`, `Sold out`, `Cancelled`, `Postponed`) | admin-queues.jsx:325-330 |
| EventReportsQueue | filters | activeFilter.default | `"all"` | admin-queues.jsx:320 |
| EventReportsQueue | filters | filter.active.bg | `var(--fg)` | admin-queues.jsx:361 |
| EventReportsQueue | filters | filter.active.color | `var(--bg)` | admin-queues.jsx:362 |
| EventReportsQueue | filters | filter.active.border | `1px solid var(--fg)` | admin-queues.jsx:363 |
| EventReportsQueue | filters | filter.inactive.bg | `transparent` | admin-queues.jsx:361 |
| EventReportsQueue | filters | filter.inactive.color | `var(--fg-muted)` | admin-queues.jsx:362 |
| EventReportsQueue | filters | filter.inactive.border | `1px solid var(--border-strong)` | admin-queues.jsx:363 |
| EventReportsQueue | filters | filter.padding | `5px 10px` | admin-queues.jsx:360 |
| EventReportsQueue | filters | filter.borderRadius | `999` | admin-queues.jsx:360 |
| EventReportsQueue | filters | filter.font | `Inter, system-ui 12/600 letterSpacing -0.005em` | admin-queues.jsx:364-366 |
| EventReportsQueue | filters | filter.count | shown next to label in mono 9.5, opacity 0.7 active / 0.6 inactive | admin-queues.jsx:369-373 |
| EventReportsQueue | filters | filter.count.computed | `f.id === "all" ? items.length : items.filter(i => i.kind === f.id).length` | admin-queues.jsx:356 |
| EventReportsQueue | filters | filter.bar.background | `color-mix(in oklab, var(--surface-1) 50%, var(--bg))` | admin-queues.jsx:352 |
| EventReportsQueue | filters | filter.bar.borderBottom | `1px solid var(--border)` | admin-queues.jsx:351 |
| EventReportsQueue | filters | shown.items | `activeFilter === "all" ? items : items.filter(i => i.kind === activeFilter)` | admin-queues.jsx:331 |
| EventReportsQueue | table | columns | `Event`, `Report`, `Evidence`, `Progress`, `Filed`, [actions width 120] | admin-queues.jsx:382-387 |
| EventReportsQueue.row | event cell | imminent.tell | `imminent · <7 days` shown when `row.imminent === true` | admin-queues.jsx:404-411 |
| EventReportsQueue.row | event cell | imminent.color | `var(--warning)` | admin-queues.jsx:408 |
| EventReportsQueue.row | event cell | imminent.font | `'JetBrains Mono', monospace 9/700 uppercase letterSpacing 0.06em` | admin-queues.jsx:407-409 |
| EventReportsQueue.row | report cell | kind.cancelled.label | `Cancelled` | admin-queues.jsx:308 |
| EventReportsQueue.row | report cell | kind.cancelled.color | `var(--danger)` | admin-queues.jsx:308 |
| EventReportsQueue.row | report cell | kind.postponed.label | `Postponed` | admin-queues.jsx:309 |
| EventReportsQueue.row | report cell | kind.postponed.color | `var(--warning)` | admin-queues.jsx:309 |
| EventReportsQueue.row | report cell | kind.soldout.label | `Sold out` | admin-queues.jsx:310 |
| EventReportsQueue.row | report cell | kind.soldout.color | `var(--warning)` | admin-queues.jsx:310 |
| EventReportsQueue.row | report cell | kind.available.label | `Tickets available` | admin-queues.jsx:311 |
| EventReportsQueue.row | report cell | kind.available.color | `var(--success)` | admin-queues.jsx:311 |
| EventReportsQueue.row | report cell | pill.bg | `color-mix(in oklab, ${t.color} 14%, transparent)` | admin-queues.jsx:417 |
| EventReportsQueue.row | report cell | pill.borderRadius | `999` | admin-queues.jsx:416 |
| EventReportsQueue.row | report cell | pill.padding | `3px 8px` | admin-queues.jsx:416 |
| EventReportsQueue.row | report cell | pill.font | `Inter, system-ui 11.5/700 letterSpacing -0.005em` | admin-queues.jsx:419-420 |
| EventReportsQueue.row | evidence cell | text | `{row.evidenceType.replace(/-/g, " ")}` | admin-queues.jsx:432 |
| EventReportsQueue.row | evidence cell | font | `'JetBrains Mono', monospace 9.5/700 uppercase letterSpacing 0.06em` | admin-queues.jsx:428-430 |
| EventReportsQueue.row | evidence cell | bg | `color-mix(in oklab, var(--fg) 6%, transparent)` | admin-queues.jsx:427 |
| EventReportsQueue.row | progress cell | dots.count | `Array.from({ length: row.needed })` | admin-queues.jsx:436 |
| EventReportsQueue.row | progress cell | dot.filled | `i < row.confirms` → bg = `t.color` | admin-queues.jsx:439 |
| EventReportsQueue.row | progress cell | dot.unfilled | bg = `transparent` | admin-queues.jsx:439 |
| EventReportsQueue.row | progress cell | dot.border | `1.2px solid ${t.color}` | admin-queues.jsx:440 |
| EventReportsQueue.row | progress cell | dot.size | `7×7`, borderRadius `50%` | admin-queues.jsx:438-439 |
| EventReportsQueue.row | progress cell | count.text | `{row.confirms}/{row.needed}` | admin-queues.jsx:449 |
| EventReportsQueue.row | progress cell | reporter.text | `by {row.reporter}` | admin-queues.jsx:455 |
| EventReportsQueue.row | progress cell | reporter.font | `'JetBrains Mono', monospace 9.5 letterSpacing 0.04em` | admin-queues.jsx:453-454 |
| EventReportsQueue.row | filed cell | text | `{row.reportedAt}` (e.g. `3h ago`, `30m ago`) | admin-queues.jsx:461,176,191 |
| EventReportsQueue.row | action cell | button.text | `Resolve →` | admin-queues.jsx:464 |
| EventReportsQueue.row | action cell | button.variant | `outline` | admin-queues.jsx:464 |
| EventReportsQueue.row | row.bg_when_imminent | claim | NOT SPECIFIED — only the inline `imminent · <7 days` tell is applied; row bg unchanged | admin-queues.jsx:404-411 (see Ambiguities) |

### 8b. EventReportResolutionPanel per-event surface

| Component / Surface | State / Variant | Property | Value | Source |
|---|---|---|---|---|
| EventReportResolutionPanel | default | width | `800` | admin-queues.jsx:576 |
| EventReportResolutionPanel | default | padding | `24` | admin-queues.jsx:576 |
| EventReportResolutionPanel | default | background | `var(--bg)` | admin-queues.jsx:577 |
| EventReportResolutionPanel | default | borderRadius | `14` | admin-queues.jsx:580 |
| EventReportResolutionPanel | default | border | `1px solid var(--border)` | admin-queues.jsx:581 |
| EventReportResolutionPanel | header | eyebrow.text | `Event reports · Phase 8.5` | admin-queues.jsx:592 |
| EventReportResolutionPanel | header | title.format | `{artist} · {venue} · {date}` (sample: `Electric Callboy · Mission Ballroom · Aug 30`) | admin-queues.jsx:597 |
| EventReportResolutionPanel | header | status.pill.kind | `warning` (AdminStatusBadge) | admin-queues.jsx:599 |
| EventReportResolutionPanel | header | status.pill.text | `open report` | admin-queues.jsx:599 |
| EventReportResolutionPanel | guidance | text | `A status report is pending corroboration. Promote it now, or keep the current state. The reporter is not penalized — reports are signal, not violations. Promotion creates the same status-flip a 2-fan corroboration would.` | admin-queues.jsx:612-616 |
| EventReportResolutionPanel | layout | has counter | grid `"1fr 16px 1fr"` two-up | admin-queues.jsx:620 |
| EventReportResolutionPanel | layout | no counter | grid `"1fr"` (single column) | admin-queues.jsx:620 |
| EventReportResolutionPanel | pending column | label | `Pending report` | admin-queues.jsx:629 |
| EventReportResolutionPanel | counter column | label | `Counter` | admin-queues.jsx:654 |
| EventReportResolutionPanel | counter column | render condition | `hasCounter === true` | admin-queues.jsx:640 |
| EventReportResolutionPanel | reason field | eyebrow.text | `Reason (shown to both reporters)` | admin-queues.jsx:674 |
| EventReportResolutionPanel | reason field | sample.text | `Verified the IG post is from the band's official account. The parody-account theory doesn't hold — refunds confirmed via venue. Promoting cancelled. Thanks to both reporters.` | admin-queues.jsx:685-687 |
| EventReportResolutionPanel | actions | needMoreInfo.text | `Need more info` | admin-queues.jsx:693 |
| EventReportResolutionPanel | actions | needMoreInfo.variant | `outline` | admin-queues.jsx:693 |
| EventReportResolutionPanel | actions | promoteCounter.text | `Promote counter` | admin-queues.jsx:694 |
| EventReportResolutionPanel | actions | promoteCounter.variant | `success` (background `var(--success)`) | admin-queues.jsx:694 |
| EventReportResolutionPanel | actions | promoteCounter.render | only when `hasCounter === true` | admin-queues.jsx:694 |
| EventReportResolutionPanel | actions | promoteReport.text | `Promote {t.label.toLowerCase()}` (e.g. `Promote cancelled`) | admin-queues.jsx:695 |
| EventReportResolutionPanel | actions | promoteReport.variant | `danger` (`color: var(--danger)`, border `var(--danger)`) | admin-queues.jsx:695,95 |
| EventReportResolutionPanel | actions | layout | flex, gap 10, justifyContent flex-end | admin-queues.jsx:691-692 |
| EventReportResolutionPanel | state.transition | promote effect | "Promotion creates the same status-flip a 2-fan corroboration would" | admin-queues.jsx:614-615 |
| EventReportResolutionPanel | state.transition | reporter.penalty | none — "reports are signal, not violations" | admin-queues.jsx:613-614 |
| EventReportResolutionPanel | state.transition | atomicity | implied via README §8: "One transaction: new report goes live + conflicting live report flips to `archived`, `supersededBy` set" | README:337 |
| EventReportResolutionPanel | state.transition | events.status.propagation | cancelled / postponed flip `events.status`; soldout only updates `price.soldOutBy` + `price.soldOutConfirms`, does NOT change `events.status` | README:338 |
| ReportEntry | winner | border | `2px solid ${t.color}` (kind-tinted) | admin-queues.jsx:490 |
| ReportEntry | winner | badge.text | `winner` | admin-queues.jsx:502 |
| ReportEntry | winner | badge.bg | `t.color` | admin-queues.jsx:498 |
| ReportEntry | winner | badge.color | `var(--fg-on-accent)` | admin-queues.jsx:498 |
| ReportEntry | admin-override | badge.kind | `neutral` (AdminStatusBadge) | admin-queues.jsx:513 |
| ReportEntry | admin-override | badge.text | `admin override` | admin-queues.jsx:513 |
| ReportEntry | metadata.reporter | label | `Reporter` | admin-queues.jsx:524 |
| ReportEntry | metadata.evidence | label | `Evidence` | admin-queues.jsx:526 |
| ReportEntry | metadata.evidence.value | format | `evidenceType.replace(/-/g, " ")` | admin-queues.jsx:527 |
| ReportEntry | metadata.link | label | `Link` (only when `evidenceLink` present) | admin-queues.jsx:530 |
| ReportEntry | metadata.link | element | `<a href>` clickable, color `var(--signal)` underlined | admin-queues.jsx:531-536 |
| ReportEntry | metadata.reported | label | `Reported` | admin-queues.jsx:539 |
| ReportEntry | metadata.confirms | label | `Confirms` | admin-queues.jsx:541 |
| ReportEntry | metadata.confirms | value | `{confirms} of {needed}` | admin-queues.jsx:543 |
| ReportEntry | metadata.confirms | imminent.tell | when `needed > 2`, appends ` · ER_POLICY · imminent` in `var(--warning)` | admin-queues.jsx:544 |
| ReportEntry | evidenceNote present | format | quoted: `"{evidenceNote}"`, italic, `var(--fg-muted)` | admin-queues.jsx:548-558 |

---

## Ambiguities

Items the bridging spec must resolve — design either omits or implies them, leaving runtime semantics open.

### A1. Atomicity of admin promotion (price disputes)
- **What's claimed:** `AdminDisputePanel` guidance says "Pick the number that should live on the event page... the loser is archived (not deleted) with a reason." Counter-submit non-admin path explicitly mentions "auto-archived with a 'superseded by counter' reason" (README:189). Event-report side explicitly calls "One transaction" (README:337).
- **What's missing:** The price-side admin promotion does NOT explicitly say "in one transaction" or specify whether `events`/`prices` denormalized projections update atomically with the archive flip. The spec should lock: a single DB transaction that (a) flips counter to live, (b) archives original with admin reason, (c) records audit row, (d) updates any denormalized projections.

### A2. "Need more info" action semantics
- **What's claimed:** Button labeled `Need more info` renders in both `AdminDisputePanel` and `EventReportResolutionPanel`. No state-transition value, no recipient surface.
- **What's missing:** Does this defer (no state change)? Notify reporters with a message? Set a status field? The spec must define: where the message goes, what state the dispute moves to (e.g., `awaiting-info`), and whether reporters get an in-app/email notification.

### A3. Reason field — required vs. optional
- **What's claimed:** Reason field is shown with a sample multi-line string and an eyebrow `Reason (shown to both submitters)` / `Reason (shown to both reporters)`. It has `minHeight: 44`.
- **What's missing:** Is it required to promote/keep? Is empty reason allowed? Is there a character limit?

### A4. Parent (original) already resolved by the time admin opens panel
- **What's claimed:** Header pill reads `open dispute` / `open report` — implies a precondition that the contest is still open.
- **What's missing:** If admin opens an adjudication that has since been resolved (counter naturally lands first, or another admin acts concurrently), what does the UI show? An error state? A read-only "already resolved" view? The spec must define this no-op / stale-state path.

### A5. Multiple concurrent counters / challengers
- **What's claimed:** Both admin panels render exactly one "Original" and one "Counter" column.
- **What's missing:** The schema's `supersededBy` link suggests chains are possible. If two counters arrive against the same original, the queue shows two rows (one per counter), but the panel only handles one-vs-one. The spec must define: how to render a 1-vs-N adjudication, or assert that only the first counter is adjudicable while others queue behind.

### A6. Withdrawn challenger (counter)
- **What's claimed:** `CorroborationSheet self-locked` has a `Withdraw` button for submitters (dispute-surfaces.jsx:311-319). README §8 mentions "Withdrawal" semantics: `status = archived`, `archivedReason = "withdrawn by reporter"`.
- **What's missing:** What does the admin queue / panel show if the counter was withdrawn while admin had the panel open? Likely vanishes from the queue — but is there a toast / refresh path?

### A7. Click-through on submitter handles in admin panel
- **What's claimed:** Submitter handles render as plain text `<span>` in `AdminEntry`.
- **What's missing:** Should admin be able to drill into a submitter's profile / trust history (per README §8.4 "Reporter trust view")? Likely yes, but not specified for v1.

### A8. Mobile/responsive behavior for admin queues + panel
- **What's claimed:** README §9 explicitly defers desktop layout for the consumer surfaces; admin surfaces have fixed widths (`AdminDisputePanel` 760px, `EventReportResolutionPanel` 800px) and `PriceDisputesQueue` is a `<table>` with no responsive breakpoints.
- **What's missing:** The product is mobile-first (CLAUDE.md guiding principle #3). Admin surfaces are implicitly desktop-only — the spec should state this explicitly (desktop-only, min-width assumed) or define a mobile fallback.

### A9. Accessibility — ARIA roles, focus management, keyboard handling
- **What's claimed:** Native HTML elements (button, table, anchor) are used; no `aria-*` attributes anywhere.
- **What's missing:** Filter chips need `aria-pressed`. Modal-style panel (`AdminDisputePanel`) needs `role="dialog"`, focus trap on open, ESC to close. Table needs scope attributes on `<th>`. The spec must enumerate accessibility requirements.

### A10. Loading + error states for queue and panel
- **What's claimed:** Only `empty` state is defined (`return null` for queues).
- **What's missing:** What's shown while the queue/panel is fetching? On API error? Stale-data refresh? Optimistic UI when an action lands?

### A11. Success state after promote/keep/decline
- **What's claimed:** No post-action surface defined.
- **What's missing:** Does the panel close on success? Show a confirmation toast? Redirect back to the queue? Optimistically remove the row?

### A12. EventReportResolutionPanel — `winner` parameter semantics
- **What's claimed:** `winner` prop accepts `"report" | "counter" | null` (admin-queues.jsx:565) and drives the highlighted border on `ReportEntry`.
- **What's missing:** Is `winner` a preview-of-decision (admin hovers/clicks one before committing), or a post-decision frozen state? The design demo uses it for static rendering only.

### A13. Filter chips persistence (EventReportsQueue)
- **What's claimed:** `activeFilter` is a prop with default `"all"`.
- **What's missing:** Is the active filter persisted (URL query param, local storage)? Restored on revisit?

### A14. Sort affordances (`Sort: filed-at`)
- **What's claimed:** `Sort: filed-at` and `All disputes` / `All reports` are styled as ghost buttons in the header.
- **What's missing:** What other sort options exist? Are these buttons or dropdowns? "All disputes" implies a navigation to a fuller list view — where does it route?

### A15. Audit logging
- **What's claimed:** Not mentioned in the design files at all.
- **What's missing:** CLAUDE.md guiding principle #2 says "audit every admin action." Every promote/keep/decline must produce an audit row — spec needs to lock the shape.

### A16. EventReportResolutionPanel actions — three-button layout when `hasCounter` is true vs. two when false
- **What's claimed:** When no counter, only `Need more info` and `Promote {kind}` render. When counter exists, all three render including `Promote counter`.
- **What's missing:** What happens to the `Promote counter` action if `hasCounter === false` after the panel loaded (race condition)? Probably falls back to two-button — but unstated.

### A17. `confirms` field type inconsistency (price vs. report)
- **What's claimed:** `PriceDisputesQueue.row` uses numeric `confirms` (`row.original.confirms`); `AdminDisputePanel.AdminEntry` uses free-form string (`"2 fans · 0 admin"`); `EventReportResolutionPanel.ReportEntry` uses `{confirms} of {needed}`.
- **What's missing:** API contract should normalize. Likely two fields: `confirms` (int) + a computed display string. Spec must lock.

---

## What this UI is and what it does

Concert Crawl's admin contest-review covers two adjudication families: **price disputes** (one fan submitted a price, another fan countered with a different number) and **event status reports** (sold-out / cancelled / postponed / tickets-available claims). Both share the same chrome so admins learn one pattern.

The system has two layers per family. **Queues** (`PriceDisputesQueue`, `EventReportsQueue`) live as auto-hiding sections inside the existing Review page, list every open contest as table rows with both sides' data, and route admins to per-event panels via `Resolve →`. The queues are warning-colored badges, mono-uppercase column headers, and a `--surface-1` rhythm consistent with the rest of admin. Event reports add filter chips (`All`, `Sold out`, `Cancelled`, `Postponed`) and an `imminent · <7 days` tell on rows where the show is < 7 days out and the report is `cancelled` (which raises the corroboration threshold from 2 to 3).

**Per-event panels** (`AdminDisputePanel`, `EventReportResolutionPanel`) are 760–800px two-up surfaces. Each renders the original entry and the counter side-by-side with a `vs` divider, full submission shape (range + tier + vendor + trust pill for price; kind pill + evidence + link + note for reports), a free-text reason that's shown to both parties, and three actions: `Need more info` (defer), `Keep original` / `Promote counter` (for price), or `Need more info` / `Promote counter` / `Promote {kind}` (for reports). Promoting flips the live entry to the chosen side and archives the loser with the reason — no penalty to either submitter; "disputes are updates, not violations."

---

## File metadata

- Path: `docs/superpowers/design-tables/admin-contest-review.md` (repo-relative)
- Sources: `admin-queues.jsx` (708 lines), `dispute-surfaces.jsx` (893 lines)
- Section count: 8 tables + Ambiguities (17 items)
