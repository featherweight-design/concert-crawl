# Custom sign-in and sign-up · Design handoff (2026-11-12)

Concert Crawl's own sign-in and sign-up pages, replacing Clerk's stock `<SignIn />` and `<SignUp />`, which are the only screens that don't look like the app. They are built on Clerk's custom-flow hooks (Clerk Pro, so no "Secured by Clerk").

- **Canvas:** https://claude.ai/artifact/BPBJsDbqA3w4h8gy2ED2k2 (its own canvas, not the B+ one).
- **Status:** drawn, awaiting Hugh's review. Every new string is **DRAFT** in [`COPY.md`](COPY.md) and goes through `copy-review`.
- **Sources:** `design/custom-auth/` in the project files: `auth_ui.py` (every state and the copy object), `boards.py` (registry and export; `python3 boards.py <dest>`), `copy_md.py` (writes COPY.md from the copy object), `canvas.py` (the review page). They reuse the B+ kit (`refresh-canvas/bplus.py`), so tokens, the CCMark, the sheet edge and the venue glyphs are the shipped ones.
- **Read before building:** the B+ handoff (`design_handoff_bplus_redesign`, including addendum 2 and 3), today's `apps/web/src/app/sign-in`, `sign-up`, `auth/code`, `auth/complete` and `_components/invite-landing`, and The 99's `design_handoff_the99_small_items_11` (addenda A1 and A2), whose state coverage this follows.
- **Out of scope:** account settings, sign-out, delete account, the onboarding tour, Clerk's emails, tiers and billing (the app is free).

## Boards

`screens/<section>/<name>.jpg` at 2x, `boards/<section>/<name>.html` standalone, `manifest.json` lists all 89 with their captions. `-m` is phone 390, `-320` is phone 320, `-d` is desktop 1300. Electric unless the name says Light.

| Section | Boards |
|---|---|
| `01-sign-in` | start (m, 320, d, Light m and d), not an email, password (m, d), it didn't work, signing in, email code (sent, wrong, ran out, new code sent), new-device code (m, d), breached password |
| `02-forgot-password` | email, code and new password (m, d), too short, too easy, breached, saving, changed |
| `03-google` | opening, back and signing in (m, d), cancelled, new person while invite-only (m, d), consent still needed on return (unticked, pressed unticked) |
| `04-invite-code` | from a link or QR, typing, a plain code, checking, not found, already used, expired, too many tries, 320, desktop, Light |
| `05-sign-up` | the form, ticked, pressed unticked, Terms open, too short, too easy, breached, bot check, making the account, verify (code, wrong), email already used, account made, after launch, 320, desktop (form, pressed unticked, Terms open), Light (form, pressed unticked) |
| `06-arriving-with-intent` | from Watch (m, d), Follow, a crew invite, a protected page, Watch as a new person, back on the show |
| `07-loading-and-trouble` | loading (m, d), sign-in blocked (m, d, Light), network dropped, rate limited |
| `08-nine-themes` | sign-in start in all nine themes |
| `09-parts` | every state of every piece, Electric and Light |

## Decisions

1. **One page shape.** Phone: the form is the page, under the app's logo, with Terms and Privacy at the foot. Desktop: one 440px panel, centered, with the sheet's blue-to-pink top edge following its corners, and the venue-glyph row (`21 venues · crawled every morning`) under it as the only flourish. The page background is the screen's one glow; nothing inside the panel glows. No app header or nav: none of it works signed out.
2. **Never reveal whether an email has an account.** Continue on sign-in always goes to the password step. A wrong password, an unknown email and a code-only account all get one line (`pw.didntWork`). The emailed code, the reset code and sign-up's verify step use "If {email} has an account" or "We sent a code" wording that reads the same either way. Sign-up with a taken email shows the same Verify screen; no code ever comes, and the line under it points them to sign in. The press is padded to about 900 ms (1500 ms for reset), as The 99 does, so timing doesn't leak it either. This needs Clerk's enumeration protection at **Strict** (question 2).
3. **Consent.** A real, unticked checkbox the person ticks, with Terms (`/legal/terms`) and Privacy (`/legal/privacy`) as links. A link opens the live page in a sheet (phone) or dialog (desktop) over the form, and **Back to the form** keeps every field and the tick. Pressing Make my account or Google while unticked sends nothing: the box goes red, focus moves to it, and `up.consentError` is read out.
   - **Google: consent is captured before leaving for Google**, not on return. The checkbox sits above both presses, so one rule covers both and the person meets it once. It means `legalAccepted: true` travels with the sign-up Clerk starts, so no account record exists without it, and nobody comes back from Google to a surprise extra step. The return screen (`google-consent-return-m`) is only a fallback for when Clerk still reports `legal_accepted` in `missingFields`, for example a Google sign-up transferred from the sign-in page after launch.
   - **The Private Beta Agreement joins the same checkbox while the beta lasts** (`up.consentBeta`), and the code screen's "By continuing you agree" line goes. One tick, one record, and no consent by continuing. After launch the line drops the Beta Agreement (`signup-launch-m`). Question 8 asks Hugh to confirm.
4. **The step trail.** Sign-up's steps are marked with the CCMark's own trail: one dot per step, growing toward the core, and the core lights pink when the account exists (`signup-done-m`). It is the auth pages' motif, so they don't borrow the ticket stub or crew rings. During the beta it is three steps (invite code, account, email check), so the live "Step 1 of 2" becomes "Step 1 of 3". After launch it is two.
5. **Invite code.** The live screen restyled, same flow: a code from `?code=` (link or poster QR) is filled in and checked for shape at once, but they still press Continue. It formats as they type and paste. Named codes (4 to 20 letters and numbers, no `BETA-`) are whole once 4 long. Errors keep the live strings, and *used* and *expired* add where to go next. Too many tries locks the field and counts down. On sign-up the code shows as an **Applied** chip with **Use a different code**.
6. **Google while invite-only.** A Google account with no Concert Crawl account is refused: no account is made, and the start screen shows a card naming the Google address with **Use an invite code** and **Join the waitlist**. Google proved the address, so saying "no account" here reveals nothing to a stranger. With an invite, Google on the sign-up form works as usual (question 1).
7. **Arriving with intent.** From Watch, Follow, a crew invite or a protected page, a card with the show, artist, crew patch or page replaces the title block, on sign-in and on sign-up, through the invite code and the email check. Every signed-out tap goes to sign-in (addendum 3). Once in, they land where they were and the action they pressed is replayed once, with a toast (`intent-return-m`). Pages are named for My shows, Settings, Crews and Notifications; anything else reads "Sign in to keep going". Question 5 asks whether to keep the card.
8. **Breached password is a warning, not an error.** Amber, a lock glyph, and **Reset password** into the forgot flow. Nothing the person did wrong.
9. **New device.** Clerk's device check after a right password gets its own eyebrow and title (Confirm it's you), so it never reads as a second password prompt.
10. **Trouble.** Loading is the form's own shape held still (no shimmer, so reduced motion needs no special case). Blocked keeps the live `AuthLoadingState` copy after 10 seconds, names no browser, and Try again is a full reload. Offline is a banner over the step they were on, with fields kept and the press waiting. Rate limited (Clerk's 429) locks the field and counts down.
11. **Themes.** The pages follow the device's stored theme, Electric by default, using the same pre-paint read as the error page. No new color tokens: everything is `signal`, `accent`, `success`, `warning`, `danger` and the surfaces.
12. **No first name at sign-up** (recommended, question 3). Google supplies one; email sign-ups are asked later, where the profile already asks for a handle.

## State table

| State | Trigger | What they see | Next step | Board |
|---|---|---|---|---|
| Start | `/sign-in` | Google, or, Email, Continue; invite-code foot during beta | Password step or Google | `01/start-*` |
| Not an email | Continue with a malformed address | Field error, checked before Clerk | Fix and continue | `01/start-email-error-m` |
| Password | Continue with any email | Email with Change, password, Forgot, Email me a code | Sign in | `01/password-*` |
| It didn't work | Wrong password, unknown email, code-only account | One line; password cleared | Try again or email a code | `01/didnt-work-m` |
| Signing in | Sign in pressed | Press dims, field locks (padded ~900 ms) | Return path, or new-device code | `01/busy-m` |
| Email code | Email me a code instead | "If {email} has an account…", six boxes, resend countdown | Sign in | `01/email-code-*` |
| New-device code | Clerk returns a second factor | Confirm it's you, six boxes | Return path | `01/new-device-*` |
| Breached | Clerk refuses a pwned password at sign-in | Warning page | Reset password | `01/breached-m` |
| Forgot | Forgot password? | Email kept from sign-in | Code and new password | `02/forgot-email-m` |
| Reset | Send code | Code boxes and new password on one screen | Save and sign in | `02/forgot-code-*` |
| Reset errors | Too short (client), too easy, breached (Clerk) | Error under the password, code kept | Fix and save | `02/forgot-*` |
| Changed | Clerk sets it and signs in | Check, about a second | Return path | `02/forgot-done-m` |
| Google opening | Google pressed | Press dims, Opening Google… | Google | `03/google-busy-m` |
| Google back | `/sso-callback` | Signing you in | Return path or onboarding | `03/google-returning-*` |
| Google cancelled | Back with no session | Quiet note above Google | Try again or email | `03/google-cancelled-m` |
| Google refused | New Google account, invite-only | Card naming the address | Invite code or waitlist | `03/google-refused-*` |
| Google consent | `legal_accepted` still missing on return | The checkbox, alone | Make my account | `03/google-consent-*` |
| Invite from link | `/auth/code?code=` | Filled in, Looks good | Continue | `04/code-prefilled-m` |
| Invite errors | 404, 409, 410, 429 | Live line plus next step; 429 counts down | Fix, sign in or wait | `04/code-*` |
| Sign-up form | Valid invite cookie, or public after launch | Applied chip, email, password, consent, Make my account, or, Google | Verify | `05/signup-*` |
| Pressed unticked | Either press with the box unticked | Red box, focus on it, line read out | Tick | `05/signup-unticked-press-*` |
| Terms open | Terms or Privacy link | Live page in a sheet or dialog | Back to the form | `05/signup-legal-open-*` |
| Bot check | Smart CAPTCHA asks | Widget in `#clerk-captcha` under consent | Press wakes when solved | `05/signup-bot-check-m` |
| Verify | Account started | Six boxes, resend, Wrong email, sign-in line | Finish | `05/verify-*` |
| Email used | Sign-up with a taken email | Same as Verify; no code arrives | Sign in instead | `05/email-used-m` |
| Account made | Verified | Press turns You're in, trail core lights | `/auth/complete`, then onboarding | `05/signup-done-m` |
| Intent | Watch, Follow, crew invite, protected page | Context card in place of the title | Return and replay | `06/*` |
| Loading | Clerk not ready | Form-shaped skeleton | Form | `07/loading-*` |
| Blocked | No Clerk after 10 s | Live blocked copy, Try again | Reload | `07/blocked-*` |
| Offline | Request fails offline | Banner, fields kept, press waits | Retry when back | `07/offline-m` |
| Rate limited | Clerk 429 | Field locks, countdown | Wakes | `07/rate-limited-m` |

## Fields

| Field | Element | Attributes |
|---|---|---|
| Email, sign-in | `input type=email` | `autocomplete="username"`, `inputmode=email`, `autocapitalize=off`, `spellcheck=false` |
| Email, sign-up and reset | `input type=email` | `autocomplete="email"`, otherwise as above |
| Password, sign-in | `input type=password` | `autocomplete="current-password"`; Show toggles `type` and is a 44px button with `aria-pressed` |
| Password, sign-up and reset | `input type=password` | `autocomplete="new-password"`, `passwordrules="minlength: 8;"`; the rule line is its `aria-describedby` |
| 6-digit code | one `input` drawn as six boxes | `autocomplete="one-time-code"`, `inputmode=numeric`, `pattern="[0-9]*"`, `maxlength=6`; paste and SMS/email autofill fill all six |
| Invite code | `input type=text` | `autocomplete=off`, `autocapitalize=characters`, `spellcheck=false`, 16px or more (no iOS zoom) |
| Consent | native `input type=checkbox` in a `label` | unticked by default, `required`; the links inside open the sheet and must not toggle the box |

All text inputs are 16px so iOS doesn't zoom. Every error sets `aria-invalid` and is tied by `aria-describedby`; on a failed press focus moves to the first invalid field. Form-level lines (it didn't work, offline, rate limited) sit in a polite live region. Focus is the app's signal ring. Every target is 44px or more, including Show, Change, resend and the foot links. Motion uses the existing tokens only; the spinner holds still under reduced motion.

## Components

- **Reused:** the B+ page background, logo and CCMark, `topedge` sheet edge, sheet and dialog, gradient primary button, theme tokens, venue glyph SVGs (`design_handoff_bplus_redesign/assets/venues`), crew patch, thumb with genre ring, `AuthLoadingState` (as the blocked state, restyled), `InviteCodeField` formatting, `/legal/*` pages (rendered in the sheet).
- **New:** `AuthPage` (phone page and desktop panel), `AuthField`, `PasswordField` (Show), `CodeBoxes`, `ConsentCheck`, `GoogleButton`, `StepTrail`, `IntentCard`, `LegalSheet`, `AuthBanner`. One source each: sign-in, sign-up, reset and the invite screen all use the same pieces.

## For engineering

The eng scoping note in the thread's design prompt (Part B) is the plan; these are the points the boards depend on.

- `legalAccepted: true` goes only from the ticked checkbox, on the password path and with the Google sign-up. On a Google return, handle `legal_accepted` in `missingFields` with `google-consent-return-m`. Gate the cutover on a staging run of both paths that shows Legal accepted on the user.
- Mount `<div id="clerk-captcha" />` under consent on sign-up and on `/sso-callback`.
- The Google refusal depends on blocking the sign-in to sign-up transfer while invite-only. Verify on staging whether the drop-in lets it through today.
- Timing pads (about 900 ms, 1500 ms for reset) and Strict enumeration protection go together.
- Every sign-up still ends at `/auth/complete` (invite redemption, #1113, then onboarding), and the return path and invite-cookie gate stay as they are.
- **Divergence found:** `lib/invite-code.ts` only accepts `BETA-XXXX-XXXX`, but the landing's placeholder is `CRAWL-XXXX` and the prompt names plain 4 to 20 character codes. The formatter and the server action's pattern need to accept both.

## Build-vs-design check

Before the cutover PR is ready, screenshot every board's state at 320, 390 and 1300, in Electric and Light, against `screens/`, and list the differences in the PR. Check in particular: the consent box starts unticked on every path, the Google press is refused while unticked, the step trail's count, 44px targets, the 16px inputs, and that no copy says whether an email has an account. One source of truth per piece (the component list above); no second copy of a field or button.

## Questions for Hugh

1. **Google during the beta.** Recommended: turn a new Google account away and point it to the invite code, as The 99 does (`google-refused-*`).
2. **Account privacy.** Recommended: "That email or password isn't right" for everyone, with Clerk's protection at Strict.
3. **First name at sign-up.** Recommended: no, only email and password.
4. **"Email me a code instead" on sign-in.** Recommended: keep it; it's on today and it's the way back in for people who never set a password.
5. **Say why they're being asked to sign in.** Recommended: yes, the intent card (section 06).
6. **Brave and other blockers.** Recommended: keep the "didn't load, try again" screen now, and spike Clerk's proxy option separately.
7. **Branded verification and reset emails.** Recommended: later, as its own PR.
8. **One checkbox for the beta.** Recommended: put the Private Beta Agreement in the sign-up checkbox and drop the code screen's "By continuing you agree" line.
