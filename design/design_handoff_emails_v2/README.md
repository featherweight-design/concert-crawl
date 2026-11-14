# Emails v2 · Design handoff (2026-11-14)

Concert Crawl's emails redrawn in the B+ language: the invite, the weekly digest and its shared shell, and Clerk's four code emails. Today the invite is plain text, the digest uses an older dark-only palette, and Clerk sends its stock templates.

- **Canvas:** https://claude.ai/artifact/V5RZoVj3MPHEDcA1ktF8Cf (its own canvas).
- **Status:** drawn, awaiting Hugh's review. Every string is **DRAFT** in [`COPY.md`](COPY.md) and goes through `copy-review`.
- **Sources:** `design/emails-v2/` in the project files: `em.py` (palettes, atoms, every email, copy object, and the reference generator), `boards.py` (registry and export; `python3 boards.py <dest>`), `shoot.js` (2x screens), `canvas.py` (the review page).
- **Read before building:** `apps/api/src/emails/` (layout, atoms, palette, the digest template and its tests), `apps/api/src/lib/email.ts` (`sendInviteCodeEmail`), `apps/api/src/routes/email-unsubscribe.ts`, and `design_handoff_custom_auth` (the pages these code emails pair with).
- **Out of scope:** admin alerts (crawl failures, test email), billing emails (`design_handoff_monetization_emails` stays parked), any new email.

## What's in the folder

| Path | What |
|---|---|
| `reference/*.html` | **The real emails.** Table layout, inline styles, 600px, light inline with dark mode and phone as `<style>` overrides generated from the same source, so they match the boards exactly. Port these, don't redraw them. |
| `reference/text/*.txt` | Subject, preheader and the plain-text part of each. |
| `reference/clerk-*.html` | Clerk-ready: the code is `{{otp_code}}`, the device line is wrapped in `{{#if requested_from}}`. |
| `screens/<section>/<name>.jpg` | 2x boards. `-m` phone 390, `-320` phone 320, `-d` desktop (a 1000px mail window), `-dark` dark mode, `-text` the plain-text part. |
| `boards/<section>/<name>.html` | Standalone boards; `manifest.json` lists all of them with captions. |
| `img/cc-mark-96.png` | The CCMark tile for the header, to host at `https://concertcrawl.app/email/cc-mark-96.png` (`apps/web/public/email/`). |

| Section | Boards |
|---|---|
| `00-shell-and-parts` | every shared piece, light and dark |
| `01-invite` | phone, desktop, light and dark, 320, no expiry, a named code, plain text |
| `02-weekly-digest` | 3 shows (phone, desktop, light, dark), 5 plus “+4 more”, 1 show, a quiet week (light, dark), long names at 320, images off, Outlook for Windows, plain text (both) |
| `03` to `06` | sign-in, verify email, password reset, new device: phone, desktop, light and dark, plain text; sign-in also at 320 and with no device line |
| `07-inbox` | every subject and preheader as an inbox shows them, light and dark |
| `08-unsubscribe-page` | the one-click page: digest off (phone, desktop, dark), link didn't work, something went wrong |

## Decisions

1. **One brand look, light by default, Electric in dark mode.** Light is inline, so every client gets a finished email even if it strips `<style>`. `prefers-color-scheme: dark` (Apple Mail, iOS Mail, Outlook apps) and `[data-ogsc]`/`[data-ogsb]` (Outlook.com) switch to the Electric palette. Gmail's apps ignore both and invert colors themselves, which is why the base is light: they handle a light design predictably and are known to mangle dark ones. The colors are the Light and Electric theme tokens, never the reader's chosen theme. (Question 1.)
2. **One shell for every email.** The sheet's blue-to-pink top edge (solid cyan where gradients don't render), then the CCMark tile as a hosted PNG beside the live-text wordmark `concert`+`crawl.` (no space, as in the app) and a mono eyebrow naming the email. Footers come in three kinds: **digest** (why you get it, one-click Turn off the weekly digest, Email settings, the legal line and a mailing address), **account** (codes: can't be turned off, only sent when asked), **invite** (who invited this address; ignore it and nothing happens). No glow anywhere: box-shadow doesn't survive email, and the shell has its edge instead.
3. **Each email gets one motif, not shared ones.** The invite's code sits on the share sheet's ticket (perforation with notches, an Admits one stub with the expiry). The code emails use the auth pages' motif, the CCMark trail of seven growing dots leading into the code. The digest leads with artist photos in the Browse treatment: a 2px genre ring on the thumbnail and a 2px genre left edge on the row (no glow).
4. **The invite opens the invite screen filled in.** The button goes to `/auth/code?code=<code>`, so it lands on `code-prefilled-m` from custom-auth. The code is also printed in full, with `concertcrawl.app/auth/code` as the fallback for when the button fails. “What happens next” mirrors the sign-up step trail (code, account, email check). With `expires_at` null the stub says No expiry.
5. **The digest's rows.** Up to five rows, then “+N more this week”. Each row: photo (or a genre tile with the initial when there's none), artist, tour, date, time and venue in mono (venue drops a line on phones), price in mono, a View link, and two optional chips: **Watching** (signal) and **Sold out** (accent, the status color). The whole name is a link too. The quiet week keeps its live behavior (two taste picks; with none, nothing is sent).
6. **Codes are shown, never linked.** One `{{otp_code}}` in a 42px mono box, unsplit because Clerk sends one value and splitting it would break copy-paste. No magic links, no buttons. Under it: works for 10 minutes and only the newest works, then the device and time it was asked from when Clerk provides them (left out, not blank, when it doesn't), then the “didn't ask?” line and “We'll never ask you for this code”.
7. **Never reveal an account (custom-auth rule 2).** Nothing in a code email names the person, a handle, a show or anything else from the account; the body reads the same as the page that asked for it. Sign-up with a taken email sends nothing (same as the page). The new-device email adds an amber card for the person it wasn't, with Reset your password, because it goes only to the owner. The unsubscribe page reads the same whether or not the account exists (live behavior, kept).
8. **No code in any subject or preheader**, so lock screens and notification previews don't show it. iOS and macOS still offer the code from the body for autofill. (Question 2.)
9. **The unsubscribe page** is redrawn in the same look (it renders straight off an email, signed out): a check for done, an amber mark for the two failures, Open Settings as the next step on failures, and Changed your mind? Turn it back on in Settings when it worked.
10. **Email-safe rules for the build:** tables only, inline styles, `role="presentation"`, 600px max with a 10px phone gutter, no web fonts required (Inter and JetBrains Mono load where allowed and fall back to the system stack), images with width, height and alt and a background color behind them, buttons as a colored cell with a link inside (Outlook for Windows gets a solid button and square corners, see `digest-outlook-d`), and a preheader with spacer characters so the client doesn't pull body text into it.

## States per email

### Invite (`sendInviteCodeEmail`)

| State | Trigger | What they see | Board |
|---|---|---|---|
| Default | Admin emails a code with an expiry | Ticket with Good until {date}, Accept your invite | `01/invite-*` |
| No expiry | `expires_at` null | Stub reads No expiry | `01/invite-noexpiry-m` |
| Named code | A plain code like DENVERFAM | Same ticket, shorter code | `01/invite-named-m` |
| Button blocked | Client strips the link or style | Printed code + typed URL | every invite board |
| Plain text | Text-only client | `reference/text/invite.txt` | `01/invite-text` |

### Weekly digest (`spotify_digest`)

| State | Trigger | What they see | Board |
|---|---|---|---|
| A week of shows | 2 to 5 matches | “{n} shows by artists you follow.”, rows, Open Concert Crawl | `02/digest-*` |
| More than five | 6 or more | Five rows, then +N more this week | `02/digest-more-d` |
| One show | 1 match | Singular subject and title | `02/digest-one-m` |
| Quiet week | 0 matches, picks found | Zero note, Based on your taste, two picks | `02/digest-zero-*` |
| Nothing at all | 0 matches, 0 picks | No email (live `skipped-empty`) | none |
| Watching | They already watch the show | Watching chip on the row | `02/digest-m` |
| Sold out | The event is sold out | Sold out chip, accent | `02/digest-m` |
| No photo | Artist has no image | Genre tile with the initial | `00/parts-*` |
| Images off | Client blocks images | Alt text on the genre fallback | `02/digest-images-off-d` |
| Outlook for Windows | Word engine | Square corners, solid edge and button | `02/digest-outlook-d` |
| Long names | Long artist or tour | Wraps; never truncates | `02/digest-long-320` |
| Unsubscribe link missing | `EMAIL_UNSUBSCRIBE_SECRET` unset | Turn off link goes to Settings (live fallback) | none |

### Clerk code emails (sign-in, verify email, password reset, new device)

| State | Trigger | What they see | Board |
|---|---|---|---|
| Code sent | Clerk sends the template | Title, one line, code box, device line, safety lines | `03..06/*-m`, `*-d` |
| No device line | `requested_from` empty | Line left out | `03/si-nofrom-m` |
| Dark mode | Client in dark | Electric palette | `*-dark-*` |
| New code asked for | Resend on the page | A new email; “Only the newest code works” covers the old one | same boards |
| Taken email at sign-up | Sign-up with an existing address | No email (custom-auth rule 2) | none |
| Unknown email at sign-in or reset | Clerk Strict protection | No email; the page reads the same | none |
| Plain text | Text-only client | `reference/text/clerk-*.txt` | `*-text` |

### Unsubscribe page (`GET /v1/email/unsubscribe`)

| State | Trigger | Board |
|---|---|---|
| Digest off | Valid token | `08/unsub-off-*` |
| Link didn't work | Malformed or bad token | `08/unsub-bad-m` |
| Something went wrong | Secret unset or write failed | `08/unsub-down-m` |

## Divergences found in the live code (fix in the build)

- `notificationsUrl()` points at `/me`, the settings home. It should be `/me?section=notifications`.
- The digest's wordmark is `concert crawl.` with a space; the app's is `concertcrawl.` with no space.
- `palette.ts` (`ME`) is its own dark palette (`#04050C`, `#0B0E20`), not the Electric tokens; v2 uses the theme tokens.
- No `List-Unsubscribe` / `List-Unsubscribe-Post` headers on the digest. Gmail and Yahoo expect one-click unsubscribe headers on subscribed mail; the signed URL already exists, so add both headers.
- `DigestEmailShow` has no image, genre bucket, watching or sold-out field; the rows need `imageUrl`, `genreBucket`, `watching` and `soldOut`, all derivable today (`events.image_url`, `events.genre` through `packages/types` genre buckets, the watching rows, `lib/sold-out.ts`).
- The invite email is plain text with an em dash in copy, and links to `/auth/code` without the code.
- `lib/invite-code.ts` accepts only `BETA-XXXX-XXXX` (already flagged by custom-auth); the named-code board depends on that fix.

## Build notes

- **Our emails (invite, digest)** stay on Resend and the `apps/api/src/emails/` pipeline. Rewrite `layout.ts`, `atoms.ts` and `palette.ts` from `em.py`'s `shell`, `header`, `footer`, `edge`, `button`, `row`; move the invite into the registry as a template (`invite_code`) so it gets the same text-parity and fixture tests as the digest.
- **Clerk's emails** go into the Clerk dashboard (Customization → Emails) for the verification code, password reset code and new-device templates. Paste `reference/clerk-*.html`; confirm the variable names (`{{otp_code}}`, `{{requested_from}}`, `{{requested_at}}`) against the editor's list before saving, and set the sender name to Concert Crawl. If the editor won't take raw table HTML, rebuild it with its blocks in the same order; the layout is one column so it maps either way. Paste the matching `.txt` into the plain-text field where there is one.
- **Hosted images:** the CCMark PNG at `/email/cc-mark-96.png`. Artist photos use the same URLs as the app.
- **Build-vs-design check (required):** render every reference email through the template code and screenshot it at 390, 320 and 600+ in light and dark next to the matching board; list any differences in the PR before it's ready. Send each to a real Gmail (web and iOS app), Apple Mail (light and dark) and Outlook inbox and attach the screenshots. Keep one source of truth: the shell atoms are the only place header and footer markup lives.

## Questions for Hugh

1. **Light by default, or dark everywhere like today?** **DECIDED (Hugh, 2026-11-14): light by default, Electric in dark mode.** Recommended: light inline with Electric in dark mode. Gmail's apps recolor dark emails on their own, and every client that strips styles still gets a finished light email. Dark everywhere looks more like the app in clients that leave it alone, but risks muddy results in Gmail.
2. **Code in the subject line?** **DECIDED (Hugh, 2026-11-14): no.** Recommended: no. It's faster to read from a notification, but it puts the code on lock screens; autofill reads it from the body anyway.
3. **A mailing address in the digest footer.** **Open: Hugh is taking it to engineering.** CAN-SPAM asks for a physical postal address on commercial mail, and a weekly digest that sells tickets may count. Recommended: add Featherweight Design, LLC's mailing address (a PO box or registered agent address is fine) to the digest footer only. The boards show `{mailing address}` until you pick one.
4. **Reply-to.** **Open: Hugh is taking it to engineering.** Recommended: the invite and the digest reply to a real inbox you read (beta testers reply with feedback); the code emails stay no-reply.
