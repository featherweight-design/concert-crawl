# Admin Redesign: Phasing

The redesign replaces almost every admin page, so it ships in phases. The smallest risk goes first, and each phase can deploy to staging on its own. Admin is used only by admins, so a phase can replace a page outright, with no feature flag. The exception is Phase 6, which changes the fan app and goes behind a flag.

## Pipeline steps (per `docs/superpowers/design-pipeline.md`)

1. **Handoff PR (docs only).** Add this folder as `design/design_handoff_admin_redesign/`, plus a 🕰️ Backlog row in `design-pipeline-status.md`.
2. **Readiness Review.** Write `READINESS.md` in this folder. The engineering needs in `README.md` are the likely Yellow items.
3. **Plan PRs**, one per phase, in `docs/superpowers/plans/`. Write Phase 0's plan first.
4. **Implementation PRs** per phase. Each one lists the boards it implements and passes [`BUILD-CHECK.md`](BUILD-CHECK.md) before it is marked ready.
5. **Copy review** (`copy-review` skill) runs on [`COPY.md`](COPY.md) before the phase that ships each string.
6. **Release notes.** Only Phase 6 changes what fans see, and it gets a `releases.ts` entry. Admin phases get none.

## Phase 0: Shell and shared pieces

- The new sidebar, the mobile tab bar with More, and the user menu (desktop and mobile).
- Remove the User app / Admin toggle. Link Open Concert Crawl from admin, and Admin from the app's account menu (that row already exists).
- Shared components:
  - `VenueStatus`, the two chips
  - the fan `StatusChip`, reused
  - the small-caps kind label
  - an overlay `SidePanel` with a scrim
  - `BottomSheet` and the confirm dialog
  - page and table skeletons
  - empty state
  - the save-failed toast
- Remove every keyboard-shortcut hint and the Settings page. The theme follows the app.
- **Exit:** every existing page renders inside the new shell, unchanged inside.

## Phase 1: Health and Crawl run reasons

- The crawler records run reasons and the pages it fetched (engineering need 1). This is the data behind Health, Needs you and Venues, so it goes first.
- Health replaces the dashboard: tiles, the grouped venue grid, cost against a budget setting, and the Done for you log.

## Phase 2: Needs you

- The queue, its kinds and evidence panels, grouping, ranking, snooze, price batches, and the "Approve every price myself" setting.
- Retire Review's tabs once the items flow here.

## Phase 3: Venues and Add a venue

- The venues list, the five venue tabs and the ⋯ menu.
- Then the guided Add a venue flow: draft state, test crawl, icon drafting, guide editing, Ask the venue, and the three new hero settings. The Add a venue flow can split into its own phase if it runs long.

## Phase 4: Events, Artists, Prices

- These pages, with their in-flow panels, the shared price sheet, artist search, and the Price checks tab.
- Lineups stored as artist links come with this phase or before it.

## Phase 5: People, Feature flags, Operations

- People, including Invite codes and Posters.
- The flag steps, named people and verify, in each environment's admin.
- Feedback, Emails and Activity log, with reply on the admin side.

## Phase 6: Fan side (behind a flag)

- Send feedback in the account menu.
- Reply delivery to What you missed and email.
- Suggest a venue in the modal.
- Removing the edge tab at launch.
