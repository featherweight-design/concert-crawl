## Roadmap benchmarks (Hugh, 2026-11-11)
The orchestrator updates the Roadmap page (https://claude.ai/artifact/UVMHu8nAbz8XnDwBn7Sz1e, CC docs only, pinned writes) in the same turn as each event:
1. A PR merges: set the story's status and add the PR link.
2. Hugh makes a ruling or answers a question: close the to-do and unblock what it held.
3. Hugh owes something new: add a to-do with `since` and `blocks`.
4. A lane opens, closes or rotates, or changes story: update `owner`.
5. A hold starts or lifts, or an epic changes zone: update the epic summary.
6. At each watchdog wake: refresh or confirm any story with open work not updated in 24h.
7. Before rotating: write the handoff and the roadmap.
