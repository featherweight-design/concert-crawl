## What does this PR do?

<!-- One sentence summary -->

## How to test

<!-- Steps to verify this works -->

## Screen recordings / captures

<!-- If this PR includes UI changes, attach a screen recording or screenshot here. Delete this section if not applicable. -->

## Design review

<!-- UI PRs only (`.claude/fwd/feature-acceptance.md`). Delete for docs, scripts, tests and invisible changes. -->

- **Inventory:** `docs/superpowers/inventories/<file>.json`
- **Contact sheet:** `node ~/.claude/fwd/skills/feature-acceptance/contact-sheet.mjs <inventory>` against staging, commit <!-- sha -->. <!-- This repo is PUBLIC: never attach signed-in or admin pages here. Link a private copy or redact; signed-out sheets may be attached. -->
- **Gap rule (Hugh, 2026-11-11):** the B+ boards are comprehensive; resolve a small ambiguity from the nearest drawn pattern and note it below; where the mock shows the answer, match it; only a meaningful undrawn gap goes to Design, and that piece waits for Hugh.

| Route    | Viewport | Theme | Matches board?                         | Ambiguity resolved from              |
| -------- | -------- | ----- | -------------------------------------- | ------------------------------------ |
| `/route` | 390      | Light | yes / fixed to match / gap (to Design) | <!-- nearest drawn pattern, or — --> |

### Staging walk for Hugh

<!-- Each route × viewport that needs his eye, plus every hand-walked surface named in the inventory's note. Electric and a genre theme are walked here (the kit draws Light). Phone walk is Android + Brave. -->

- [ ] `/route` · 390 · <!-- what to look at -->
- [ ] `/route` · 1300 · <!-- what to look at -->
- [ ] By hand: <!-- surface and how to reach it -->

## Checklist

- [ ] Tests pass locally (`pnpm test`)
- [ ] Types pass (`pnpm typecheck`)
- [ ] No new lint errors (`pnpm lint`)
- [ ] Relevant documentation updated
