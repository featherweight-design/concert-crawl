# Gap Report — #762 Who Else Is Watching

Date: 2026-07-29
Handoff: `design/design_handoff_who_else_is_watching/`
Method: `design-review` skill — Agent 1 enumerated the design property table from
the handoff only, Agent 2 verified the implementation row by row plus a state
reachability pass, Agent 3 confirmed the fixes.

## Result

**4 visual gaps, 0 state reachability gaps. All 4 fixed. Agent 3: 0 remain.**

All 14 states in the handoff's coverage table are reachable from the
`{ total, named[] }` response shape — every branch exists and passes the right
props.

## Visual gaps found and fixed

| #   | Element                    | Design                             | Was                            | Fix                          |
| --- | -------------------------- | ---------------------------------- | ------------------------------ | ---------------------------- |
| 1   | Anonymous disc border      | `1.5px solid var(--border-strong)` | `1px dashed` (shared `Avatar`) | new `WatcherAnonDisc`        |
| 2   | Anonymous disc centre dot  | `size × 0.22`, `var(--fg-subtle)`  | no dot                         | new `WatcherAnonDisc`        |
| 3   | Roster disc separator ring | `0 0 0 2px var(--surface-1)`       | no ring                        | ring wrapper + `ROSTER_RING` |
| 4   | Expander focus ring radius | `3px`                              | `rounded-sm` (6px here)        | `rounded-[3px]`              |

Gaps 1 and 2 were fixed with a watchers-local `WatcherAnonDisc` rather than by
editing `components/settings/Avatar.tsx`. `Avatar`'s dashed empty circle is the
right visual for "no avatar set" on a profile form; here the disc stands for a
real person who simply has no handle. Changing the shared primitive would have
altered settings surfaces outside this ticket's scope.

## Deliberate divergences from the prototype (not gaps)

- **Tailwind tokens instead of inline styles / hardcoded font stacks.** The
  prototype hardcodes `'Inter, system-ui'` and `'JetBrains Mono, monospace'`;
  the build uses token utilities and `var(--font-mono)`.
- **`kind`/`value` instead of the prototype's `t`/`v`** — ESLint `id-length`.
- **`eyebrow` copy key omitted** — the prototype defines it but never renders
  it. Shipping it would be a string with no consumer.
- **Roster capped server-side at `ROSTER_CAP = 25`** (sentence cap stays
  `NAMED_CAP = 3`). Resolves the handoff's own flag that an uncapped roster
  would render one row per watcher indefinitely.
- **Additions the prototype lacked:** a `prefers-reduced-motion` guard on the
  1.4s shimmer, and a ≥44px mobile tap target on the expander (the handoff
  asserts 44px in prose but the prototype only sets `min-height: 28`).
- **Single shared name join.** The prototype built the screen-reader string with
  a separate regex from the rendered parts — two paths that can drift, which the
  handoff explicitly warns against. `watchersToParts` derives `aria` from the
  same `parts` array, and a test asserts sighted/aria parity across five cases.
