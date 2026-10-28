# Concert Crawl extension for design-status

## Label scheme

- Design tickets carry `type: design`. Every open `type: design` issue must sit
  in one of the four lists or a transient state; one absent from the tracker is
  flagged as Unplaced.
- Phase and priority come from `phase: <value>` and `priority: <value>` labels.
  Render e.g. `Beta · Normal`, `Pre-beta · Blocker`, `Launch · Normal`.
- The Backlog is ranked by beta-phase urgency.

## Progress log

Implementation progress on shipped work lives in `docs/superpowers/progress.md`
(not this skill's question).

## Tracker maintenance

Tracker updates follow the design-track persona's optimistic-tracker-maintenance
rule: they happen in the PR that changes the underlying state.

## History behind the rules

- 2026-08-02: the tracker ran a "Backlog" and a "Ready for design" list whose
  legend definitions were identical; the readout papered over it by demoting
  five imminent items into a footnote. That is why Unplaced exists.
- 2026-08-02: the near-term list was merged into Backlog. A "cap at 4 rows"
  Backlog rule silently dropped ranks 5–7 and Hugh had to spot the gap; the
  older "cap at 8 rows" Greens rule was the same defect. Hence "never cap".
- Example handoff folders and related scopes seen in the tracker:
  `profile_cards`, `shareable_cards`, "Passport scope". Bottleneck example:
  "4 Greens sit ready and Spotify alone will fill a week or two."
