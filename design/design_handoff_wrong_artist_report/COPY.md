# Wrong-artist reports: strings for copy review

Every fan-facing string below is new and must go through the `copy-review` skill before it ships. `{artist}` is the artist's display name. Admin strings are exempt from the copy rules and are listed only for completeness.

## Artist page card

| Key | String |
| --- | --- |
| Eyebrow | SPOT SOMETHING OFF? (reused from the event page) |
| Title | Wrong artist? |
| Body | Photo or music from a different {artist}? Let us know. |
| Footnote | We match artists to Spotify by name. A person checks every report. |
| Reported title | You reported this artist |
| Reported body | We’re checking it. Thanks for the heads up. |
| Reported chip | UNDER REVIEW |
| Reported footnote | Only you see this. The page stays as it is until we fix it. |

## Report sheet

| Key | String |
| --- | --- |
| Eyebrow | ARTIST REPORT |
| Close | Cancel |
| Title | Not the right artist? |
| Subtitle | We match artists to Spotify by name, and some names are shared. Tell us what looks wrong. |
| Match label | THIS PAGE IS MATCHED TO |
| Match meta | ON SPOTIFY · {genres} |
| Match link | Open in Spotify ↗ |
| Reasons label | WHAT’S WRONG? |
| `different_artist` | A different artist, same name / The photo and the music belong to someone else. |
| `wrong_photo` | Right music, wrong photo / The songs are theirs. The picture isn’t. |
| `not_an_artist` | Not an artist / A festival pass, a ticket package or a theme night. |
| `other` | Something else / Tell us in the note. |
| Link label | The right artist on Spotify (optional) |
| Link placeholder | Paste a Spotify link |
| Link hint | In Spotify, open their profile, then Share and Copy link. It’s the fastest way for us to fix it. |
| Link error (422) | That isn’t a Spotify artist link. *(not drawn)* |
| Note label | Anything else? (optional) |
| Note placeholder | Where they’re from, what they play… |
| Counter | 0 / 280 |
| Submit | Send report |
| Footnote | A person checks it before anything changes. |

## Results

| Key | String |
| --- | --- |
| Sent rail | GOT IT · SENT / SENT |
| Sent title | Thanks. We’ll check it. |
| Sent body | If it’s a mix-up, we’ll swap in the right {artist} and let you know in your notifications. |
| Sent stub | {artist} · different artist (the picked reason) / UNDER REVIEW · WITH US |
| Sent button | Back to artist |
| Already rail | ALREADY REPORTED / DONE |
| Already title | You’ve flagged this one. |
| Already body | We’re still checking your report. One open report per artist, so withdraw it if you got it wrong. |
| Already buttons | Back to artist / Withdraw |
| Error rail | DIDN’T SEND · ARTIST REPORT / ERR |
| Error title | Didn’t go through. |
| Error body | Couldn’t reach the server. Your answers are still here. Try again or come back later. |
| Error buttons | Try again / Close |

## Notification

| Key | String |
| --- | --- |
| Title | We fixed {artist}’s page. |
| Body | Thanks to your report, the photo and music now belong to the right artist. |
| Category | ARTISTS |

## Admin (exempt)

Chip `Reported ({n})`; row chip `{n} REPORTS`; panel label `MATCHED NOW`; `SUGGESTED`; buttons `Use this artist`, `Dismiss reports`; the helper line `Any fix or dismiss closes both reports. A fix also tells the reporters.` and the page note `Reported rows are artists a fan says we matched to the wrong act. Check the suggestion, then fix the match the usual way.`
