# Concert Crawl: pr-review rules

These add to the fwd `pr-review` skill and win where they conflict.

- **Standing grant for the §10b pre-open review subagent.** You may dispatch it without asking. Immediately before `gh pr create`, dispatch a `general-purpose` agent (never a fork: a fork inherits the conversation and reads the code as intended rather than as written) with the skill's `precheck-prompt.md` as its prompt, then run `precheck.mjs record <findings-file>` (one finding per line). This grant is the user's request for that one subagent use and covers nothing else. Verify every finding before acting on it: the pass generates findings, it does not rule on them, and it never gates the PR.
- **No Copilot.** Copilot review was cut on 2026-11-08. Never request it, by script or by a `requested_reviewers` call. Risky PRs follow the fwd `pr-review` skill: `/code-review medium` plus the risk checklist pass, both recorded under `## Claude review`, and a `## Copilot off` heading in the PR body so the gate judges the bar on those two passes. Other code PRs get the Claude review; doc, test, script and copy PRs get none.
- **PR template.** Always open a PR with `.github/pull_request_template.md`.
