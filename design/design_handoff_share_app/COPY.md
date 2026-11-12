# Share Concert Crawl by QR · COPY

Every string on the boards. **DRAFT** strings are Design’s wording and go through the `copy-review` skill before they ship. **LIVE** strings already ship (`CONSUMER_COPY.share`) and are reused word for word. `{n}` and `{name}` are filled in at runtime. No em-dashes.

## Account menu row

| Key | Text | Status |
|---|---|---|
| `menu.row` | Share Concert Crawl | DRAFT |
| `menu.metaInvite` | Your invite | DRAFT |

## Share sheet

| Key | Text | Status |
|---|---|---|
| `sh.eyebrow` | Share Concert Crawl | DRAFT |
| `sh.close` | Close | DRAFT |
| `sh.titleInvite` | Bring your friends in | DRAFT |
| `sh.bodyInvite` | We’re invite-only for now. Anyone who scans your code skips the waitlist. | DRAFT |
| `sh.titleOpen` | Share Concert Crawl | DRAFT |
| `sh.bodyOpen` | Every Denver show in one calendar. Send it to someone you’d go with. | DRAFT |
| `sh.qrAria` | QR code for your invite link | DRAFT |
| `sh.qrAriaOpen` | QR code for concertcrawl.app | DRAFT |
| `sh.enlargeHint` | Tap the code to make it bigger | DRAFT |
| `sh.joinedLabel` | Joined with your code | DRAFT |
| `sh.joinedNone` | No one yet | DRAFT |
| `sh.joinedNoneSub` | Your code doesn’t run out. | DRAFT |
| `sh.joinedCount` | {n} friends | DRAFT |
| `sh.joinedOne` | 1 friend | DRAFT |
| `sh.system` | Share… | LIVE |
| `sh.copy` | Copy link | LIVE |
| `sh.copied` | Link copied | LIVE |
| `sh.fullscreen` | Full screen | DRAFT |
| `sh.shareFailed` | Couldn’t share. Copy the link instead. | DRAFT |
| `sh.shareText` | Every Denver show in one calendar. Here’s my invite to Concert Crawl: | DRAFT |
| `sh.shareTextOpen` | Every Denver show in one calendar: | DRAFT |
| `sh.loading` | Making your invite… | DRAFT |
| `sh.error` | Couldn’t make your invite. Check your connection and try again. | DRAFT |
| `sh.retry` | Try again | DRAFT |
| `sh.offCode` | Your invite code is turned off. This link takes friends to the waitlist instead. | DRAFT |

## Full screen

| Key | Text | Status |
|---|---|---|
| `fs.title` | Scan to get in | DRAFT |
| `fs.titleOpen` | Scan to open Concert Crawl | DRAFT |
| `fs.done` | Done | DRAFT |
| `fs.note` | Screen stays on while this is open. | DRAFT |

## Link preview (OG image)

| Key | Text | Status |
|---|---|---|
| `og.eyebrow` | You’re invited | DRAFT |
| `og.title` | Every Denver show in one calendar | DRAFT |
| `og.sub` | Concert Crawl is invite-only for now. This link lets you in. | DRAFT |

## Invite screen addition

| Key | Text | Status |
|---|---|---|
| `inv.from` | {name} sent you this invite. It’s filled in from the link, so just continue. | DRAFT |

## Notes for copy review

- `sh.shareText` / `sh.shareTextOpen` are the `text` handed to the system share sheet, followed by the link.
- `sh.offCode` must not say why the code was turned off.
- `inv.from` uses the sharer’s first name only (question 2 in the README).
