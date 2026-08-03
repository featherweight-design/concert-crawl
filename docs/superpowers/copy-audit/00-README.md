# Copy audit — index

A full-codebase copy audit run with the `copy-review` skill (`~/.claude/skills/copy-review/SKILL.md`).

**Mode: propose.** No source file was edited. Every row in every slice is a finding, not a change. This
document exists so the findings can be triaged into batches rather than actioned as one sweep.

Related: #1278.

---

## Slices

| # | Report | Surface | Strings |
|---|---|---|---|
| 01 | [`01-consumer-core.md`](01-consumer-core.md) | `consumer/copy.ts`, `lib/copy.ts` | ~700 |
| 02 | [`02-monetization-artist.md`](02-monetization-artist.md) | tier-picker, going, spotify, artist-page | ~397 |
| 03 | [`03-notifications-pwa.md`](03-notifications-pwa.md) | notifications, lifecycle-nudges, reporting, back-chip, PWA, onboarding | 243 |
| 04 | [`04-settings-auth-brand.md`](04-settings-auth-brand.md) | settings/plan, plan/manage, settings/notifications, auth/code, app shell, landing poster | ~219 |
| 05 | [`05-emails.md`](05-emails.md) | all 16 transactional email templates (20 rendered variants) | 118 |
| 06 | [`06-releases-push-jsx.md`](06-releases-push-jsx.md) | `releases.ts`, push, Spotify fan-out, hardcoded-JSX sweep | 15 + sweep |
| 07 | [`07-history.md`](07-history.md) | concert history | 36 |

**~1,728 customer-facing strings enumerated.** Complete, not sampled.

**Deliberately out of scope:** `components/admin/definitions/copy.ts` and
`components/admin/review/definitions/copy.ts` (117 em-dashes between them). Admin UI is internal, and
CLAUDE.md exempts it from the consumer design pipeline. If we ever want an admin pass, it is one more slice.

---

## Combined verdict tally

| Verdict | Count | Meaning |
|---|---|---|
| **KEEP** | ~1,536 | Earns its place. 89% of everything enumerated. |
| **TIGHTEN** | 128 | Right idea, too many words or a banned character. |
| **CUT** | 35 | Delete. The screen still explains itself. |
| **RENAME** | 19 | Vocabulary violation (rule 10). |
| **TOOLTIP** | 6 | Useful but hideable. Parked until the tooltip designs land. |
| **STALE** | 1 | Accurate when written; the product shipped past it. |
| **DEAD** | 1 | No reachable render site. |
| **DEFECT** | 1 | Words are right, plumbing is wrong. |

**191 findings.** Of those, roughly **half are mechanical** (em-dash removal, terminal punctuation, a
banned synonym) and half are editorial judgment calls. The mechanical half can ship as one low-risk PR;
the editorial half wants Hugh's eye first.

The 89% KEEP rate is the headline. This codebase is not over-written. The problems are concentrated, not diffuse.

---

## Cross-cutting categories

### 1. Em-dashes — the largest single class

**~399 em-dash characters in customer-facing copy** (excluding admin's 117):

| Where | Count | Verdict |
|---|---|---|
| `releases.ts` | 72 chars / 66 lines | **Frozen record. Do not touch.** House style applies to new entries only. |
| `consumer/copy.ts` | 89 | In scope |
| Email templates | 49 lines / 13 files | In scope |
| `settings/plan/copy.ts` | 37 | 12 are the `——` punchlines, locked by a design table |
| tier-picker / spotify | 30 each | In scope, several locked |
| Everything else | ~93 | In scope |

Rule 4 exempts code comments, JSDoc, tests, specs, plans, and PR bodies. It also forbids a repo-wide
sweep PR: untouched neighbours stay untouched. So this is not one commit, it is a per-surface job that
rides along with whatever else that surface needs.

Two narrow keeps: `founderSign: '— Hugh'` and log-rule dashes. A dash in front of a sentence is always wrong.

### 2. Vocabulary violations (19 RENAMEs)

Three separate live instances of **"saved shows"**, the banned synonym for Watching. Two of them are in
Obligation-class copy (`CHANGES_DISCLOSURE_COPY`, the cancel takeover subhead) and are **locked by the
#780 design table**, so fixing them in code alone means they recur the next time a handoff regenerates.
This needs an upstream fix in the design table, not a code edit.

`watchingEmptyBody` says *"Add a show to **follow** it"* — follow is the artist verb, never the show verb.

`releases.ts:707` carries the same drift, but it is a frozen record and stays.

### 3. Repeated promises (rule 7)

The pattern: one true thing, stated four or five times on one screen.

- **Founder price promise, 4x** (5x when it is the current plan): the email subject, the sub line, the seat
  stamp, and the `pricePromise` atom all say "$3, locked, forever." The strongest form is the atom; the
  others can yield.
- **Cancel-flow 90-day retention promise, twice** ~80px apart, with the second copy contradicting itself
  ("switch off alerts, follows" then "your follows and alerts stay safe").
- **`trial.endsTomorrow` eyebrow** repeats `railLabel` verbatim four elements away.
- **"Watching" appears three times within ~80px** on the empty watching state: nav tab, page eyebrow, empty-state eyebrow.

### 4. Engineering defects wearing a copy costume

These are **not copy edits**. Each is a code change and should become a GH issue.

| Finding | Where | Nature |
|---|---|---|
| `watchingEmptyBody` calls price alerts "Soon" while `WatchZone.tsx:51` renders them as a live promise | consumer | One of the two is lying. The hint is shipped behaviour. |
| `MANAGE_SHEET_COPY.subtitle` advertises "pause it"; `ManageSheet.tsx` offers no pause | settings | Advertises an action that does not exist |
| `EvidenceForm` says "3 confirms", a hardcoded footer ~400px below says "Live after 2 fan confirms" | reporting | Two numbers, one rule |
| Onboarding's "Not yet" list still advertises Notifications and Artist following as missing | onboarding | Both shipped (#737/#1062, #1115/#763) |
| `welcome-paid.ts` renders `Welcome · supporter` and `Welcome · Supporter` two rows apart | emails | Casing |
| `renderTextShell` takes no `note` param, so four `footerRow` notes never reach plain-text readers | emails | Plumbing |
| `history.locked.body` promises "a calendar feed you can subscribe to"; the API ships a point-in-time `.ics` download | history | Paywall promises a thing #70 explicitly decided against |
| `detailEmpty` is unreachable (rail never mounts at count 0) | history | Dead branch |
| `PassportTeaser` renders the `—` genre placeholder that `HistoryHeader` deliberately hides | history | Same screen, two treatments |
| `feedback.modal.statusRail.success*` unreachable (call site hardcoded to `tone="error"`) | consumer | Dead branch |
| **11 HTML / plain-text disagreements** across email templates | emails | Two readers, two messages |

### 5. Convention violations — hardcoded JSX

**124 actionable customer-facing strings live inline in `.tsx` instead of a `definitions/copy.ts`**, against
the CLAUDE.md rule. Not a copy-quality list; a convention list.

| Area | Count |
|---|---|
| `components/settings/*` | 45 |
| `app/legal/*` (terms 21, privacy 13, beta 10) | 44 |
| `components/consumer/*` non-hero | 21 |
| Everything else | 14 |

A further 45 in release-note hero art are Data class (fictional ticket-stub artwork) and are **not** violations.

`app/legal/*` is Obligation-class content living entirely inline, and it still contains two literal
`[date — fill before launch]` placeholders. That is the one item here with a launch deadline attached.

### 6. Rulebook gap found in the field

The push title cap of 40 characters is **unreachable by construction**: `${artistAtVenue}` alone can exceed
it (`"Godspeed You! Black Emperor at the Mission Ballroom"` is 51). The skill was patched mid-audit to
express push caps as a fixed-text budget (25 of 40, 80 of 120), but the product still needs an explicit
truncation convention for the variable. Worth an issue.

---

## Suggested order of work

1. **`app/legal/*` placeholders** — the only finding with a launch deadline. Fill the dates, decide whether legal copy moves to a copy file.
2. **File the eng defects** (§4) as issues. Eleven of them, none are copy edits, several are user-visible lies.
3. **Mechanical em-dash + punctuation pass, per surface**, excluding `releases.ts` and locked strings. Low risk, roughly half the finding count.
4. **Vocabulary RENAMEs** — but fix the design tables first, or they regenerate.
5. **Rule 7 de-duplication** (Founder promise, cancel flow, trial eyebrow, Watching triple). Editorial; wants Hugh's eye.
6. **TOOLTIP rows** — parked until the tooltip designs land.
7. **Hardcoded-JSX migration** — a chore, best done per-area alongside other work in that area.
8. **Locked-string conflicts** — a short list only Hugh can break, collected in each slice's "Locked strings I did not touch" section.

---

## Reading a slice

Each report has the same shape: files covered with string counts, the adjacency list (which components
were opened to ground the verdicts), a verdict tally, a findings table, a "Locked strings I did not touch"
section, and a self-check. The **Adjacency note** column is the load-bearing one. A string is judged by
what sits next to it on the rendered screen, which is why most of the high-value findings here are
duplication and contradiction rather than bad writing.
