# Neon Restore Runbook

**When to use this:** Data in production is wrong or gone (a bad bulk write, a runaway crawl, an accidental delete) and the schema is fine. This runbook restores the database to an earlier state. It does not undo a migration.

If the problem is a migration that needs to be reversed, use [DB Rollback](./db-rollback.md) instead. That runbook is schema-only: it writes down migrations by hand and never restores data. If a bad migration also destroyed data, do the schema rollback first, then come back here for the data.

Both restore paths below are destructive in different ways. Read the whole page before clicking anything.

---

## 0 — Stop writes first

Disable the crawler workflows before restoring, or new writes will land on top of the state you are about to restore and be lost or mixed in.

1. GitHub → Actions → **Crawler daily** and **Crawler triggers** → ⋯ → **Disable workflow**. Cancel any run in progress. [DB Rollback, step 0](./db-rollback.md#0--stop-the-bleeding-first) describes the same step.
2. If the API is writing too (user activity, admin edits), decide whether to take it offline as described there. A restore rewinds those writes along with everything else.

Re-enable both workflows only after the restore is verified (see the last step of each path).

---

## 1 — Pick the path

| How old is the good state?                   | Path                                         |
| -------------------------------------------- | -------------------------------------------- |
| Within the last 24 hours                     | Instant restore (section 2)                  |
| Older than 24 hours, up to the snapshot life | Snapshot restore, multi-step (section 3)     |
| Older than the oldest snapshot               | Not covered here; stop and check Neon's docs |

Daily snapshots are taken at 11:00 UTC and deleted automatically after 7 days.

---

## 2 — Instant restore (within 24 hours, root branch only)

Instant restore rewinds a branch to a point in its history. It works on the root branch only, which for this project is `production`.

1. Neon console → project `concert-crawl` → branch `production` → **Backup & Restore**.
2. Choose the point in time you want. **Preview first**: the console lets you look at the data as it was at that time before you commit. Check the tables you care about.
3. Restore. Neon keeps the pre-restore state of the branch as a new branch named `<branch>_old_<timestamp>`, so you can get back whatever the restore overwrote. Do not delete it until you are sure.
4. Run the verification checks in section 5.

Warning: this overwrites production in place. The big **Restore** button at the top of Backup & Restore restores production from history (point in time) and does exactly this. It is not a safe way to look around.

---

## 3 — Snapshot restore (older than 24 hours)

Use the **multi-step** restore so that you can inspect the restored data on a separate branch before anything changes in production.

1. Neon console → project `concert-crawl` → branch `production` → **Backup & Restore**.
2. Find the snapshot you want in the snapshot list.
3. Open that snapshot row's **Restore** menu and choose **Multi-step restore**. This creates a new branch named like `branch_from_snapshot_<date>` and leaves `production` alone. It was ready within a few seconds in the drill.
4. Inspect the new branch with read-only queries (see section 5). Compare it with `production` to confirm it holds what you expect and to see what you would lose by switching over.
5. If it is right, finish the switch over from the console, following the prompts Neon gives for the new branch. Then update anything keyed on the branch ID (section 4).

Warning: the other choice in the same menu, **One-step restore**, swaps the snapshot's data into `production` directly. Per the console, it keeps the branch name and connection string but changes the branch ID. There is no inspection step. Do not use it for a first look.

If the new branch is wrong, delete it. Nothing else was touched.

---

## 4 — What to update if the branch ID changes

A restore that swaps data into `production` can change the branch ID even when the name and connection string stay the same. After any real restore, confirm the current ID:

```bash
neon branches list
```

Do not copy IDs from this page, chat, or old notes; fetch them fresh. Then check everything that is keyed on production's branch ID, including:

- **Agent guards.** The guards that block writes on production match on its branch ID. A stale ID means the guard no longer recognises production.
- **The scratch-branch workflow.** Anything that creates or resets scratch branches from production by ID.
- **Hosting env vars.** Any Vercel or other host variable that holds the branch ID. Check the connection string variables too, in case they were not preserved.
- **Anything else** that stores the ID: scripts, CI secrets, dashboards. Search the repo and the hosting settings for the old value.

Never paste connection strings or IDs into docs or PRs.

---

## 5 — Verify, then resume

Use reads only. A good comparison between the restored data and `production` (or the pre-restore branch):

1. All expected public tables are present.
2. Row counts match, table by table. Expect differences only where writes happened after the restore point, and explain each one.
3. The API starts cleanly against the restored database and a spot check of key pages works.

Then:

1. Re-enable both crawler workflows (Actions → **Crawler daily**, **Crawler triggers** → **Enable workflow**).
2. Verify a clean crawl run completes.
3. Delete the `<branch>_old_<timestamp>` branch or the inspection branch once nobody needs it.
4. File a post-incident note in `docs/runbooks/` with what happened and what prevents a repeat.

---

## 6 — Drill log

Repeat this drill every 6 months, and after any change to the Neon setup (new plan, new root branch, changed snapshot schedule). A restore you have never practised is a guess.

### 2026-11-24

- **Where:** Neon console, project `concert-crawl`, branch `production`, Backup & Restore.
- **Snapshot used:** the newest one, about 17 hours old.
- **Path:** snapshot row's **Restore** menu, **Multi-step restore**. This created a branch named like `branch_from_snapshot_<date>` and left `production` alone.
- **Timing:** the new branch was ready within a few seconds of the click. No stopwatch was kept for the checks, so there is no figure for how long verification takes. The next drill should time each step.
- **Checks:** read-only queries on the drill branch versus `production`. All 62 public tables were present with identical row counts except two, and both are explained by writes after the snapshot: the audit log had 2 fewer rows, and the artist photos table had 0 rows against 169 (those were fetched after the snapshot).
- **Cleanup:** the drill branch was deleted afterwards. Production and staging were untouched.
- **Guards:** the agent guards block `run_sql` writes on production, and the drill used reads only.

### Next drill

Due by 2027-05-24. Add a dated entry above. Time each step, including the checks, and note anything in this runbook that was wrong or missing.
