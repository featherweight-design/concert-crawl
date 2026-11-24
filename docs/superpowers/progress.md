# Concert Crawl — Progress

The full phase log up to 2026-10-31 is kept in the private archive. New rows go in the table below.

| Phase | Name                                                                                                                                                | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Ops   | Daily crawl started by a Vercel Cron Job, GitHub schedule as backup                                                                                 | ✅     |
| Ramp  | Invite-code posters: multi-use codes (#76), poster page and pre-filled invite link (#79)                                                            | ✅     |
| Edit  | Edit your Concerts: add a show you went to, from the Concerts rail (#127, PR4)                                                                      | ✅     |
| Notif | Weekly digest is opt-in: every follower eligible, nobody mailed until they turn it on (migration 0124)                                              | ✅     |
| Photo | Spotify photos re-fetched by stored id, dropped when Spotify no longer has them, never served past 30 days (artist-search PR 7)                     | ✅     |
| Photo | Spotify photo refresh keeps up: own daily budget sized from the catalogue, oldest photo first, refetch at day 20 so none reaches the 30-day ceiling | ✅     |
| Find  | Artist search API-A: MusicBrainz rows carry a type, follow-by-MBID returns the slug, list cap 8 (dark)                                              | ✅     |
| Find  | Artist search U3: tap an act with no page for a preview, Follow in it, sheet, card and palette drill-in                                             | ✅     |
| Admin | Add a venue 3c-2: test crawl of a draft venue keeps nothing and moves no streak, pause or block (migration 0129)                                    | ✅     |
| Admin | Add a venue 3c-3a: Ask the venue, Go live and the suggested-venues list, with Not for us and Undo (migration 0132)                                  | ✅     |
| Admin | Add a venue 3c-3b: a draft with no answer in 14 days reaches Needs you, and Ask the venue works on a blocked venue                                  | ✅     |
| Admin | Add a venue 3e-2a: Source step with the live test crawl, and the draft resumes on it                                                                | ✅     |
| Admin | Add a venue 3e-2a: Ask the venue sheet and dialog, recording the ask on Open in email or Copy                                                       | ✅     |
| Admin | Add a venue 3e-2b: Review and Go live, Gone live, and the Venues + link replaces the old modal                                                      | ✅     |
