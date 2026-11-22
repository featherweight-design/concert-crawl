# UI probes

Probes live in `apps/e2e/probes/`, one file per claim, run by the kit's runner:
`node ~/.claude/fwd/skills/ui-probe/probe.mjs apps/e2e/probes/<name>.mjs --base http://localhost:3010 [--expect-fail]`.

| Probe                    | Proves                                                                                                                                                                                   | Needs                                                                                                   | Fails when                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `cobill-heading-fit.mjs` | A two-name co-billed event heading shows both names in full: at most three lines, type stepping 34 → 30 → 26px, no clamp, no horizontal overflow. Needs a layout engine: jsdom has none. | `PROBE_EVENTS` (comma list of event ids; default is the longest real pair and a scratch-only long pair) | `FIT_STEPS` in `CoBilledHeading.tsx` is emptied: the long pair clamps at three lines. |
