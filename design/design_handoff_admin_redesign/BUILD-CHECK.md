# Build-vs-Design Check

Concert Crawl builds have drifted from their handoffs before: chips that differ from page to page, placeholders that shipped, vocabulary drift, and squeezed mobile layouts. Every implementation PR from this handoff runs this check **before it is marked ready**, and lists the result in the PR body.

1. **Screenshot every board the PR claims, at 320, 390 and 1280 wide,** on staging or a local build with seeded data. Use `manifest.json` to find the boards for each page.
2. **Compare each screenshot with `screens/<section>/<board>.jpg`** and list every difference, however small: spacing, order, a missing state, a word. Then fix it, or justify it in one line. "Close enough" is not a justification.
3. **Check the states, not only the happy path.** For every page in the PR, check:
   - loading (skeleton in the final shape)
   - empty
   - save failed
   - every panel, sheet, dialog and ⋯ menu drawn for it
   - mobile
4. **One source per component.** Venue status, show status, kind labels, the side panel, sheets and skeletons come from the shared components built in Phase 0. A page-local copy fails the check.
5. **Vocabulary.** Grep the diff for Saved, Favorites, Following, Submissions, Contest, Dispute, History (as a label), Spotify match and Tools. None may appear in admin UI copy.
6. **No ids or emails in the UI.** There must be no Clerk ids, UUIDs, run ids or raw user agents, and no unmasked email except after Show email.
7. **Layout.** No dead space under the shorter of two columns, and no table that shrinks for a panel (except Needs you's evidence panel).
