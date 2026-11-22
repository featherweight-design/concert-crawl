# Concert Crawl — Progress

The full phase log up to 2026-10-31 is kept in the private archive. New rows go in the table below.

| Phase | Name                                                                                                                            | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Ops   | Daily crawl started by a Vercel Cron Job, GitHub schedule as backup                                                             | ✅     |
| Ramp  | Invite-code posters: multi-use codes (#76), poster page and pre-filled invite link (#79)                                        | ✅     |
| Edit  | Edit your Concerts: add a show you went to, from the Concerts rail (#127, PR4)                                                  | ✅     |
| Notif | Weekly digest is opt-in: every follower eligible, nobody mailed until they turn it on (migration 0124)                          | ✅     |
| Photo | Spotify photos re-fetched by stored id, dropped when Spotify no longer has them, never served past 30 days (artist-search PR 7) | ✅     |
