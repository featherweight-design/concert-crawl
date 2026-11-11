# Admin Redesign: Engineering Handoff

This is a redesign of the whole admin, at `/admin`. It is built around one idea: **Needs you** is the single queue for decisions, and every other page is a reference place you visit on purpose. It works the same on desktop (1280) and mobile (from 320px). Hugh reviewed it with Design section by section on 2026-11-11. **Every board in this folder is approved.** Anything still open is listed under **Proposals to confirm**.

- **Live canvas:** https://claude.ai/artifact/XggqBuiujza1vegiCGDQnd. This is the source of truth for review, and it carries the captions and tables that explain each board.
- **Other files:** [`PHASES.md`](PHASES.md) has the phasing, [`COPY.md`](COPY.md) has the strings for copy review, and [`BUILD-CHECK.md`](BUILD-CHECK.md) has the build-vs-design check that every implementation PR must pass.
- **Visual language:** the B+ redesign (`design/design_handoff_bplus_redesign/`), with the same tokens, fonts, status colors, chips, sheets and venue glyphs. The admin adds no new color tokens.
- **Out of scope:** the fan app, except for the few fan-side boards in `07` (Reply, and Send feedback). Billing is also out, since the app is free.

## Files

| Path | What it is |
| --- | --- |
| `screens/<section>/<board>.jpg` | A screenshot of every board. Mobile boards are 2× and desktop boards are 1×. Start here. |
| `boards/<section>/<board>.html` | The same boards as standalone HTML, so you can inspect spacing, colors and SVG. These are mockups with inline styles and sample data, not code to port. |
| `manifest.json` | Every board with its section, title, caption and size. The caption is the design note for that board. |

The sections are:

- `01-foundations`
- `02-needs-you`
- `03-health`
- `04-venues`
- `05-add-a-venue`
- `06-events-artists-prices`
- `07-people-flags-operations`

All names, handles, emails, counts and prices in the boards are example data. Venue names and glyphs are the real 21.

## Information architecture

- **Sidebar (desktop):**
  - **Needs you**, with the only badge in admin, and **Health**.
  - **Manage:** Venues, Events, Artists, Prices, People, Feature flags.
  - **System:** Crawl runs, Operations.
  - Below the sidebar sits the user menu.
- **Mobile:** a 4-tab bar (Needs you, Venues, Events, More). **More** lists the rest, so there is no hamburger shelf. Tapping your avatar opens the user menu as a sheet.
- **Where today's pages go:**

| Today | New home |
| --- | --- |
| Dashboard | Health (checks only) and Needs you (anything to act on) |
| Review: Event flags, Missing, Contests | Needs you |
| Review: Price coverage | Prices › Missing a price (a backlog, never a badge) |
| Review: Submissions | Prices › Submitted prices |
| Review: All events | Events |
| Crawl | Crawl runs, plus each venue's own Runs tab |
| Venues › robots.txt audit | A filter and a column on Venues |
| Artists ("Spotify match") | Artists |
| Feedback | Operations › Feedback (bugs and error reports also reach Needs you) |
| Users, Invite codes, Posters | People, with People, Invite codes and Posters tabs |
| Settings › theme | Removed: admin follows your theme from the app |
| Settings › test email | Operations › Emails |
| User app / Admin toggle | An Admin row in the app's account menu, and "Open Concert Crawl" in the admin user menu |

## The system: rules that apply everywhere

1. **Needs you holds decisions, never volume.**
   - Every item says what happened, gives the likely cause, and offers two or three answers.
   - Items rank by how soon fans will see the problem.
   - Related items group together. For example, a whole venue's shows vanishing is one venue notice, not ten show cards.
   - The badge count is the number of decisions waiting and nothing else.
2. **One venue status, everywhere.** Always show two chips, in the same order:
   - whether the venue is on the site
   - whether it is being crawled

   The latest run is a line of text, never a third chip. Pausing crawling never hides shows; hiding is a separate, deliberate step. One shared component is used on every page.
3. **Show status uses the B+ words and colors fans see,** one status per row: Tickets available, Sold out, Postponed, Cancelled, Moved, No longer listed. Hidden is separate. Use the same `StatusChip` as the fan app.
4. **Edits happen in flow.**
   - On desktop, an edit opens a **side panel that overlays the page** with a dim scrim, so the table underneath keeps its full width. Never shrink the table.
   - On mobile, short forms are **bottom sheets**. Anything that needs the keyboard plus a long list, such as artist search, is **full screen**.
   - Confirmations that notify fans or can't be undone are a **centered dialog** on desktop and a sheet on mobile.
   - The one exception is **Needs you on desktop**. There the evidence panel sits beside the queue with no scrim, so you can work down the list. On mobile it opens as a full page.
5. **No dead space from uneven columns.** Two-column layouts must balance, or they stack. Hugh flags this often.
6. **Mobile is not a squeezed desktop.** Tables become cards or rows, and tabs become a segmented control with counts.
7. **People, not ids.** Show handles and avatars instead of Clerk ids, event UUIDs, run ids or raw user agents. Emails are masked; **Show email** reveals one and is logged.
8. **Small-caps kind labels** (VENUE, SHOW, ARTIST, BUG, FLAG) and chips are vertically centered, and there is one glow per screen.
9. **Loading is a skeleton in the page's final shape:** the same tabs, filters, columns and boxes, with rows fading toward the bottom. There is a board for every page in `07` (Loading). A spinner appears only inside a button while it saves.
10. **A save that fails snaps back.** The control returns to what is really saved, and a toast says so, with Try again.
11. **No keyboard-shortcut hints** anywhere in admin.
12. **Avatars are each person's own choice.** They are a two-color mix from a palette that will grow, so never hard-code a set.
13. **Words:**
    - Locked vocabulary: Watching, Concerts, Submitted prices, Price check.
    - Also: Pause crawling, Hide from site, Re-crawl, Fewer shows than usual, Member, Operations.
    - US English: Theater.
    - The full table is in `01-foundations` and on the canvas.

## Sections

### 01 Foundations

- Covers the navigation, the two-chip venue status legend and the words table.

### 02 Needs you

- The queue, on desktop and mobile, with one evidence panel per kind (`kinds`):
  - a show dropped
  - a show moved
  - a venue failing
  - a venue blocked
  - an artist match
  - a low-confidence event
  - a Price check
  - a bug
- Fewer shows than usual comes with a likely cause (off-season, page change or a cap).
- Price batches arrive as one sheet.
- **Decided:** artist matches enter Needs you only for shows in the next 60 days, soonest first. The answers for each notice are approved as drawn.

### 03 Health

- Replaces the dashboard. It covers the last crawl, artist sync, LLM cost against budget, and the site.
- Tiles have four rows at fixed heights: label 14, value 36, detail 36, footer 22.
- There is a board of tile states.
- The venue grid is grouped Failed › Paused › Quiet › OK, and each cell opens that venue's Runs tab.
- A "Done for you overnight" log shows what the system handled.

### 04 Venues

- The list is sorted worst first and has a robots.txt column.
- The venue page has five tabs:
  - **Overview:** the latest run with its reason, the last 14 runs, one labelled Upcoming count, and anything in Needs you.
  - **Runs**
  - **Source:** one "How we read it" choice, robots.txt, the fixed crawl rules shown read-only, and Advanced collapsed.
  - **Details**
  - **Guide**
- Re-crawl and View on site are buttons. Pause crawling, Hide from site and Delete live in the ⋯ menu, each behind a sheet.

### 05 Add a venue

- A guided flow that ends with the venue live:
  1. Basics
  2. Source, which runs a real test crawl under the real rules
  3. Icon (optional): reference images, four drafted glyphs on the 24 grid, and the real hero
  4. First-timer guide (optional): editable here, with the real fields from `packages/types/src/venue-guide.ts`. Insider tip comes first and is never drafted. Accessibility is required, or "Can't document yet".
  5. Review
- Skipped steps wait as a dot on the venue page.
- **Discovery** is "Venues people asked for". It comes from a **Suggest a venue** choice in the existing suggestions modal (decided) and from venue names in feedback. We never search or crawl the web for venues.
- **Ask the venue:**
  - Drafts a permission email that opens in your own mail app.
  - Saves the venue as a draft with crawling "Paused: waiting on permission".
  - Returns to Needs you after 14 days.
- **Hero settings** grow from three (Street, Outdoor, Arena) to six, adding Theater, Club and Gallery. They are drawn with the B+ hero renderer, and the proposed setting for each venue is on the canvas.
- Every step has its states: running, robots.txt disallows, no shows found, drafting, failed style check, nothing to draft from, and not ready.

### 06 Events, Artists, Prices

- **Events:**
  - Search and filters sit in one row, and each show has one status.
  - The price column fits wide ranges.
  - Each row has a ⋯ menu.
  - The edit page has the lineup linked to Artists, a venue picker with icons, and View on Concert Crawl and on the venue's site. **Edit price** opens the shared price sheet and is saved as your submission.
  - **Mark cancelled** opens a dialog that notifies Watchers.
- **Mobile event card:**
  - Left column: event name, then venue.
  - Right column: price, then Watching, then the status chip.
- **Artists:**
  - Tabs are To check, Matched and Not artists.
  - Each row shows the show it's for and photo candidates.
  - **Search** opens an overlay panel listing every result, best for Denver first.
  - Wrong-artist reports land here.
- **Prices:**
  - **Missing a price:** a backlog. Add price opens a panel with the ticket page first, and **Publish and next** takes you to the next show missing a price.
  - **Submitted prices**
  - **Price checks:** both prices side by side, with Ticket page as the first action.
  - The "Approve every price myself" setting sits at the top.
- Empty states for each.

### 07 People, Feature flags, Operations

- **People:**
  - Tabs: People, Invite codes, Posters.
  - **List:** handle, role, how they joined, and last active.
  - **Person page:** stats in the locked words, Role (Member, Beta, Promoter, Admin; making an admin asks first), Trying early (flags just for them), Account (masked email, the invite code, and a **Test account** switch), and Recent.
  - **Test account** is a tag, not a role.
- **Invite codes:**
  - One form and one rule set: 1 to 500 seats, expiring never, after 7, 30 or 90 days.
  - Statuses: Active, Full, Expired, Revoked.
  - The row ⋯ menu has Copy link, Make a poster, See who joined, Edit and Revoke. Ended codes offer Copy link, See who joined and Reactivate.
  - The code panel shows who joined.
  - Revoke asks first.
  - Posters keep the approved poster design (`design_handoff_invite_poster`); only the mobile look picker is fixed.
- **Feature flags:**
  - Staging and production each have **their own admin, and so their own Feature flags page**. A badge in the top bar says which one you're in.
  - Each flag has a ladder (Off, Me, Beta, Everyone) plus named people.
  - In staging admin you **Mark verified**: a short check plus an optional note.
  - Production admin shows staging's state on the right and keeps the flag locked until it's verified there.
  - Turning a flag on for Everyone in production asks first.
  - There is no retired-flags section; dead flags are removed from code.
- **Operations:**
  - Tabs: Feedback, Emails, Activity log.
  - **Feedback:**
    - Filters are To read and Done (no "Active" that includes resolved items).
    - Kinds: Bug, Error report (from Sentry, counted by people affected), Idea, Suggest a venue.
    - An item opens in the side panel with readable context and one set of buttons: Mark done, Reply and GitHub.
    - **Reply** is a single reply, not a thread. The fan gets it in What you missed plus one email, with no answer box. Their "Send more feedback" starts new feedback.
  - **Emails:** only emails we still send, previewed with a real show, plus Send me a test.
  - **Activity log:** admins only, in plain words, with who made each change and a link to it.
- **Fan side:**
  - At launch the "Tell us · Beta" edge tab goes away, and **Send feedback** joins the account menu next to Settings.
  - The release notes button and the error-page form stay.
  - The modal's kinds include Suggest a venue.
- **States:**
  - User menu (desktop and mobile).
  - Not an admin.
  - Empty states.
  - Save failed.
  - Loading for all 15 desktop pages, plus one mobile list skeleton and one mobile detail skeleton.

## Engineering needs to build

Each section's canvas card lists these. This is the full list in one place. None is a design task, and some need a schema change. Every migration is expand/contract.

1. **Crawl run reasons.** The crawler records why a run was skipped or failed and which pages it fetched. The possible reasons are:
   - page unchanged
   - calendar block not found
   - timeout
   - 403 or 429
   - robots.txt

   Venue notices, the Overview's Latest line and Runs read from it. Today Ball Arena's Skipped has no stored reason.
2. **Fetched HTML for recent runs**, not only failures, so that any run can be inspected.
3. **Needs you as a real queue:**
   - kinds, grouping and ranking
   - snooze
   - the 60-day window for artist matches
   - price batches
   - the "Approve every price myself" setting
4. **A monthly LLM budget setting** and the **Done for you** log of system actions.
5. **Venue drafts** that aren't live until Go live, and a **test-crawl mode** that returns results without publishing.
6. **Suggest a venue** in the suggestions modal, and matching venue names in feedback.
7. **Ask the venue:** the permission email draft and a 14-day reminder.
8. **Glyph drafting:** an LLM returns SVG paths on the 24 grid, and they are checked against the stroke and size rules. Its cost is tracked like other LLM use.
9. **Guide drafting** from allowed pages only.
10. **Three new hero settings:** Theater, Club and Gallery.
11. **Lineups stored as links to artists.** Today the lineup is free text.
12. **A fix for canonical names** cut from multi-act and "An evening with" titles.
13. **Handles instead of user ids** in Submitted prices.
14. **Flags:**
    - steps (Off, Me, Beta, Everyone) and named people, in each environment's own admin
    - a verified mark in staging admin, **which production admin can read** to unlock the flag
    - flag history
    - removing the `spotify-sync` flag (`packages/entitlements/src/feature-flags.ts`)
15. **A Test account tag,** not a role. It is set automatically for e2e accounts and excluded from counts, Beta and Needs you. Promoter stays as a role.
16. **Masked emails** with a logged Show email.
17. **Invite code changes:**
    - statuses (Full, Expired, Revoked)
    - Edit and Reactivate
    - who-joined lists
    - one rule set shared by codes and posters
18. **A single feedback reply,** delivered as a What you missed notice and an email.
19. **Send feedback** in the account menu, and the edge tab (`FeedbackEdgeTabGate`) removed at launch.
20. **Sentry error reports grouped** by the number of people affected.
21. **An Activity log page** over the existing admin audit records, for admins only (fan behavior stays in PostHog). Add audit entries for the admin actions not recorded yet, such as Show email, invite codes and replies, in line with CLAUDE.md's "audit every admin action".
22. **Remove the Settings page.** The admin theme follows the app theme.

## Proposals to confirm (Hugh)

- **Send feedback.** Moving it to the account menu and removing the edge tab at launch was proposed in the last round. If Hugh changes it, the fan boards in `07` change with it.
- **Arena hero accent.** A faint crescent moon and stars over the skyline, because the Arena backdrop is the building seen from outside. A ring of ceiling lights is the alternative if it should read as indoors.

## Accessibility notes

- Status and kind are never carried by color alone. Every chip has its word.
- Panels and sheets trap focus and close with the X and the scrim. Dialogs name the action in the button ("Mark cancelled", "Revoke", "Make admin").
- Touch targets are at least 44px on mobile. The bottom bars pin their main action.
- Skeletons don't animate under reduced motion.
- The masked email shows its masking to screen readers as "hidden" rather than reading out the dots.
