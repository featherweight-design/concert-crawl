# Design Readiness Review — `design_handoff_admin_triage` (#1215 · R1)

**Verdict: 🟢 Green — ready for an eng plan.**
Audited 2026-07-29 against `docs/superpowers/specs/2026-07-29-admin-triage-surfaces-design.md`.

Method per the standing audit rule: the prototype's logic was **executed** with
adversarial inputs rather than read. `orderFaults`, every `TRIAGE_COPY.evidence.*`
function, and `a11y.rowLabel` were run against all sixteen fixtures plus empty,
single-row, all-tied and unknown-condition inputs.

---

## Brief conformance

| Brief decision | Result |
|---|---|
| §3.1 Dashboard is the front door | ✅ Panel is the only triage surface; no bell, no inbox, no nav badge in the mock |
| §3.2 Derived live state, no read state | ✅ Zero read/unread/dismiss/resolved props, handlers or styles anywhere in the panel |
| §3.4 Two tiers — faults + queues | ✅ `TierStrip` × 2, distinct ground, ink and type step |
| §3.5 Faults never truncated | ✅ No `slice`, no `maxHeight`, no scroll container. The only `overflow:hidden` is the visually-hidden utility |
| §3.5 Severity band, then persistence | ✅ Verified: rank non-decreasing and `days` non-increasing within band, on all 16 fixtures. Mutation-safe |
| §3.6 Recovery derived | ✅ `model` footnote states it in the UI: *"Rows clear themselves on the next clean crawl."* |
| Copy rule | ✅ No user-facing string in JSX. All five `evidence.*` return `{ stat, detail }` |
| Tokens, nine themes | ✅ No hex in the panel; `accent-2` present in all nine themes (`theme-context.jsx` and the shipped `apps/web/src/theme/themes.ts` agree) |

All five §8 "open for Design" questions were answered, and the four undesigned
conditions (went dark, ceiling, coverage gap, plus the uncapped list) each carry
their own evidence line and deep link.

---

## Fixed inline in this PR

Per the audit rule, one-line corrections are applied here rather than sent back
as an R2.

1. **README claimed `accent-2` shipped only on Drip.** It is defined in all nine
   themes (`apps/web/src/theme/themes.ts:46–286`), and `triage-data.jsx:19` said
   so — the README contradicted its own prototype. Left uncorrected it would have
   sent eng chasing a token migration that does not exist.
2. **`SCENARIOS.highVolume.label` read "14 faults"; the array holds 16** (README
   §5b also says 16).
3. **`a11y.rowLabel` announced "Broken for 5d" on `suspect` rows** — contradicting
   the band's own definition, which exists because the venue may genuinely have 20
   shows. Now tier-aware: *"Like this for 5d."*

---

## Notes for the eng plan — no design change needed

- **`orderFaults` throws on an unknown condition** (`TypeError: … reading 'tier'`,
  at 2+ rows). Fine for a fixture-driven mock, but the production sort must
  tolerate a condition the UI doesn't know yet — new alert categories get added
  crawler-side, and a triage panel that white-screens on an unrecognised alert is
  the failure mode this whole ticket exists to prevent. Unknown conditions should
  sort last, not throw.
- **Hi-Dive sits at −54% against a −60% threshold** and still appears as a fault.
  README §2 defends it as deliberate teaching material for the mock. Production
  membership is derived (§3.6), so a below-threshold venue will simply not be in
  the list — the fixture is illustrative, not a contract.
- **Minus signs are typographic in the README (U+2212) and ASCII in the code.**
  The rendered string wins; pick one at build time.
- **Rows are `role="link" tabIndex={0}`** in the mock. Production must use the
  router's `<Link>` so middle-click and copy-link work. The composed `aria-label`
  must survive the swap — it is what makes the row legible without the layout.
- **Banding threshold of 7 (`denseAt`) was set by eye.** It is already a prop;
  keep it one.

---

## Coverage

States: empty · queues only · faults only · both · high volume (banded) ·
refreshing · one fault — all seven declared states are reachable from the Tweaks
panel and all appear as artboards. Desktop and 320px scenes exist for each, with
an identical tab sequence; the only compact divergences are positional
(persistence becomes a chip, Refresh becomes icon-only with preserved accessible
name, and the context line drops in banded-mobile so the evidence figure and
micro-chart survive).
