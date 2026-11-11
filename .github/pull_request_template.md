## What does this PR do?

<!-- One sentence summary -->

## How to test

<!-- Steps to verify this works -->

## Screen recordings / captures

<!-- If this PR includes UI changes, attach a screen recording or screenshot here. Delete this section if not applicable. -->

## Design review

<!-- UI PRs only (`.claude/fwd/feature-acceptance.md`). Delete for docs, scripts, tests and invisible changes. -->

- **Inventory:** `docs/superpowers/inventories/<file>.json`
- **Pre-PR contact sheet:** `pnpm dev`, then `node ~/.claude/fwd/skills/feature-acceptance/contact-sheet.mjs <inventory> --base http://localhost:3000`. The staging sheet (the kit's default base) is for the close-out walk after merge. <!-- This repo is PUBLIC: never attach signed-in or admin pages here. Link a private copy or redact; signed-out sheets may be attached. -->
- **Gap rule (Hugh, 2026-11-11):** the B+ boards are comprehensive; resolve a small ambiguity from the nearest drawn pattern and note it below; where the mock shows the answer, match it; only a meaningful undrawn gap goes to Design, and that piece waits for Hugh.

| Board                   | Built                                                        | Ambiguity resolved from the nearest drawn pattern | Gap                                                |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------- |
| `screens/…/<board>.jpg` | <!-- route · viewport · theme, matches or fixed to match --> | <!-- or — -->                                     | <!-- none, or the undrawn piece sent to Design --> |

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
