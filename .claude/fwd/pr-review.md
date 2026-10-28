# Concert Crawl: pr-review rules

These add to the fwd `pr-review` skill and win where they conflict.

- **Standing grant for the §10b pre-open review subagent.** You may dispatch it without asking. Immediately before `gh pr create`, dispatch a `general-purpose` agent (never a fork: a fork inherits the conversation and reads the code as intended rather than as written) with the skill's `precheck-prompt.md` as its prompt, then run `precheck.mjs record <findings-file>` (one finding per line). This grant is the user's request for that one subagent use and covers nothing else. Verify every finding before acting on it: the pass generates findings, it does not rule on them, and it never gates the PR. Score it after round 1 with `precheck.mjs score <pr> <predicted> <round1-total> --kind=K --fixed=N --shipped=M`.
- **Requesting Copilot.** Copilot does not auto-review. Run `./scripts/request-copilot-review.sh <pr-number>` after opening a PR and after every fix push that earns a round. The script hardcodes the `copilot-pull-request-reviewer[bot]` login and fails loudly if the attach doesn't take. Never hand-write the `requested_reviewers` call with `"Copilot"`: it returns HTTP 200 and silently attaches nothing.
- **PR template.** Always open a PR with `.github/pull_request_template.md`.
