# B+ Redesign: Strings for Copy Review

Almost every screen reuses live copy word for word. The strings below are new or changed, and they are **drafts**: copy is the copy-writer's call (`copy-review` skill), not Design's. Change any of them in place, and never send the handoff back to Design over wording.

## New strings

| Where | String | Notes |
| --- | --- | --- |
| Browse loading | Loading shows | Shown next to the pink wave. Also used as the Load more label while fetching |
| Event page | 4 DAYS AWAY | The countdown eyebrow on the tilted card |
| Vibe filter sheet | Every genre has a color. It's the dot on each show, and the glow around its photo. | Teaches genre = color |
| Vibe filter, active | (legend line above the filtered list) | One short line; see `04-genre-and-vibe` |
| Crew lens, empty | Show everyone | The action that clears the crew lens |
| Crews | Host, You're the host, HOST, You · Host | Replaces Keeper |
| Crews list | How crews work (three steps) | Only shown when you have a single crew |
| Artist page | The dashed note under Upcoming explaining what following does | |
| Settings | Notifications subhead, Load 35 more, the stat labels, MIX TWO, OR KEEP IT SOLID, 1 fan confirmed | |
| Passport | NEXT STAMP, NEXT, VENUES COLLECTED, UP NEXT, SPREAD 1 OF 2, NEXT PAGE IS WAITING, SWIPE FOR PAGE 2, JUMP TO, the passport code line, + 1 more you're going to | |
| What's new | All card copy | It's a feature page now, not a release log |
| Show status | Report filed (screen), Already reported (screen), the What changed subtitle | Live has no success screen, and a second report shows a raw server error |
| Show status | No longer listed (chip, row and notification) | For shows the crawler hasn't seen for 14 days. Never "Cancelled" |
| Price submitted | (the pending stub on the success screen) | Shows your price with its two confirm dots |
| Beta invite page | GOT AN INVITE?, Redeem, No code yet?, 21 VENUES · CRAWLED EVERY MORNING, THIS WEEK IN DENVER | The code placeholder format is a guess |
| Launch screen | DENVER | The only text |

## Vocabulary flags in live copy (not changed by the designs)

- **"submission"** appears in live price copy ("Submissions stay pending", "Edit submission", "Your submission"). The locked word is **Submitted prices**.
- **"Follow / Following"** appears on the live artist and event pages. CLAUDE.md lists "Following" as banned (that list is about shows: **Watching**). Hugh should decide whether artists are an exception.

## Copy already locked (do not rewrite)

- The PWA cluster (install, push, offline) is voice-locked from `design_handoff_pwa_cluster` (READINESS Green).
- Empty states, errors and the crew invite use live strings, word for word.
