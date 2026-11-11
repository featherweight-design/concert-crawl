# Edit your Concerts: strings for copy review

Every string marked **new** must go through the `copy-review` skill before it ships. Strings marked **live** already exist and are reused as they are. `{artist}` is the artist's display name, `{date}` the show date (`Sat, Nov 7`), `{venue}` the venue name, and `{since}` / `{SINCE}` the records start (`March 2026` / `MAR 2026`), which is data, not copy.

## Concerts

| Key | String | |
| --- | --- | --- |
| Row menu button (aria) | More options for {artist} | new |
| Menu: open | Open the show page | new |
| Menu: share | Share this night | new |
| Menu: remove | Didn’t make it? Remove | new |
| Add row title | Add a show you went to | new |
| Add row sub | Stamp past nights, back to {since} | new |

## Remove confirm (sheet and dialog)

| Key | String | |
| --- | --- | --- |
| Eyebrow | THAT NIGHT | live (`GOING_COPY.eyebrow.past`) |
| Close | Cancel | live pattern |
| Title | Didn’t make it? | live (`GOING_COPY.button.pastNo`), new use |
| Body | Take it out of your Concerts. Its stamp comes off your Passport, your stats drop it, and your crews won’t see you there. | new |
| Primary | Remove from Concerts | new |
| Secondary | Keep it | new |
| Footnote (from Concerts) | Changed your mind? Tap I went on the show page. | new |
| Footnote (on the show page) | Changed your mind? Tap I went again. | new |
| Toast | {artist} is out of your Concerts. | new |
| Toast action | Undo | new |

## Event page, past show

| Key | String | |
| --- | --- | --- |
| Eyebrow | THAT NIGHT | live |
| Marked button | You went · {date} | live |
| Remove lead | Didn’t make it? | live string, new use |
| Remove link | Remove it from Concerts | new |
| Unmarked button | I went | new |
| Unmarked line | Were you there? Tap it and the night lands in your Concerts with its {venue} stamp. | new |
| Stamped toast | Stamped. {artist} is in your Concerts. | new |
| Toast action | Open Passport | new |
| Hero chip | {N} DAYS AGO | new (twin of the B+ `4 DAYS AWAY`, itself pending review) |

## Add a show you went to

| Key | String | |
| --- | --- | --- |
| Eyebrow | CONCERTS | new |
| Title | Add a show you went to | new |
| Subtitle | Find the night, tap I went, and it gets its stamp. | new |
| Close | Done | new |
| Search placeholder | Artist or venue | new |
| Scopes | All Denver / My venues / Artists I follow | new |
| Records note | **Our records start in {since}.** Shows before then aren’t in Concert Crawl, so they can’t get a stamp. | new |
| Pill, off | I went | new |
| Pill, on | Went | new |
| Result count | {N} SHOWS | new |
| Results footer | That’s every {artist} show in Denver since {since}. | new |
| End divider | THE START OF OUR RECORDS · {SINCE} | new |
| End line | Nothing before this. Older nights aren’t in Concert Crawl, so they can’t get a stamp. | new |
| Empty title | Not in our records. | new |
| Empty body | We only have Denver shows from {since} on. If it was more recent, try just the artist or just the venue. | new |
| Toast | Stamped. {artist} is in your Concerts. | new |
| Toast action | Undo | new |

## Artist page Past shows

| Key | String | |
| --- | --- | --- |
| Pills | I went / Went | new (same as above) |
| Footnote | Concert Crawl started crawling in {since}. Shows before that aren’t tracked. | live (`ARTIST_COPY.pastNote`) |

## Optional (not approved): ask the morning after

| Key | String | |
| --- | --- | --- |
| Question | **Did you make it?** That was {weekday}. | new |
| Yes | I went | new |
| No | I didn’t go | new |
