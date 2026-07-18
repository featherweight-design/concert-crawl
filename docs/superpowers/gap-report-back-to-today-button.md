# Gap Report — "Back to Today" control (#1006)

Verified against `docs/superpowers/design-tables/back-to-today-button.md` (README R2 + `back-to-today.jsx`).

## IMPLEMENTED (21)

### RotateCcwGlyph — `apps/web/src/components/consumer/jump-picker/RotateCcwGlyph.tsx`

- G1 shape — viewBox 0 0 24 24, polyline `1 4 1 10 7 10` + path `M3.51 15a9 9 0 1 0 2.13-9.36L1 10` [RotateCcwGlyph.tsx:16-38]
- G2 stroke color — `var(--accent)` default, `color` prop override [RotateCcwGlyph.tsx:12]
- G3 stroke — width 2.4 default, round caps/joins, fill none [RotateCcwGlyph.tsx:13,24-27,32-35]
- G4 size — `size` prop drives w+h; 13 default, 11 in footer chip [RotateCcwGlyph.tsx:11; JumpPicker.tsx:587]
- G5 a11y — `aria-hidden="true"`, `display:block` [RotateCcwGlyph.tsx:21-22]
- G6 consolidation — imported by both BackToTodayControl and JumpPicker footer chip [BackToTodayControl.tsx:5; JumpPicker.tsx:20]

### BackToTodayControl — `apps/web/src/components/consumer/week-strip/BackToTodayControl.tsx`

- B1 trigger — rendered only when `showBackToToday` true; component unmounts when hidden (conditional in header) [WeekStripHeader.tsx:171-176]
- B2 action — `onBackToToday={() => onJumpPick(today)}` = jump to today's week + select today [CalendarView.tsx:131]
- B3 placement — first child of the `.flex.items-center.gap-1` chevron cluster, before prev chevron [WeekStripHeader.tsx:170-176]
- B4 label default — RotateCcwGlyph + "Today" text [BackToTodayControl.tsx:97-99]
- B5 ≤360px collapse — `@media (max-width:360px)` hides `.b2t-label`, pill → 34px icon-only [BackToTodayControl.tsx:24]
- B6 wording — `CONSUMER_COPY.backToTodayLabel` = "Today" [copy.ts:35]
- B7 hit target — button min 44×44 transparent, inner pill 34px [BackToTodayControl.tsx:41-51,63]
- B8 pill chrome — surface-2 / border-strong / radius 999 / JetBrains Mono / uppercase [BackToTodayControl.tsx:53-71]
- B9 hover — `.b2t:hover .b2t-pill` → overlay-press bg + border-focus [BackToTodayControl.tsx:18]
- B10 focus — `:focus-visible` ring 2px var(--focus) offset 2px on pill; button outline none [BackToTodayControl.tsx:19-20]
- B11 a11y — `<button type="button">`, `aria-label="Back to today, {spoken}"` [BackToTodayControl.tsx:88-90]
- B12 motion — fade+slide-in 170ms; reduced-motion + print show end-state [BackToTodayControl.tsx:14-16,25-26]
- B13 theming — all tokens, no hex, no Tailwind dark: [BackToTodayControl.tsx entire]

### Footer chip — `apps/web/src/components/consumer/jump-picker/JumpPicker.tsx`

- F1 glyph swap — plain 5px dot replaced with `<RotateCcwGlyph size={11} />` [JumpPicker.tsx:587]
- F2 chip stays — footer chip still rendered; both controls share the mark [JumpPicker.tsx:567-588]

### Spoken date

- aria date via `accessibleDayLabelFor(today)` → "Tuesday, Apr 28" [WeekStripHeader.tsx:173]

## GAPS (0)

None.

## DEFERRED (0)

None.
