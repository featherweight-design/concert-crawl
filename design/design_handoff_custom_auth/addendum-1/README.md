# Custom auth · addendum 1: live password strength (2026-11-27)

A live strength meter on the sign-up password, matching The 99's shipped meter (`the-99` `src/components/sign-in/strength-panel.tsx`, from `design_handoff_the99_small_items_11/addendum-password-strength`), adapted to the four levels engineering is building to. Asked by Hugh, 2026-11-27, walking staging `/sign-up/new`: "we don't have the same password strength checker as The 99."

- **Status:** drawn, awaiting Hugh's review. Every string is **DRAFT** for `copy-review` (`copy.json`).
- **Sources:** `design/custom-auth-addendum-1/` in the project files. `python3 a1.py design/design_handoff_custom_auth` patches the password block of the shipped boards and writes `boards/` and `manifest.json`; `lightmap.py` derives Light from Electric (exact on the shipped Electric/Light pairs); `node render.js <addendum dir>` writes `screens/` at 2x.
- **Fixed behaviour (not drawn as a choice):** the meter advises and Clerk decides; the press is never blocked by the meter; the 8-character minimum stays and is checked before the press; weak and fair are levels Clerk refuses, good and strong pass; no score is shown until the estimator has loaded; a password built from the person's own email scores low; Clerk can still refuse a Good password as breached or too weak.

## Boards

`-m` phone 390, `-320` phone 320, `-d` desktop 1300. Electric unless the name says `light`. 49 boards.

| Section | Boards |
|---|---|
| `00-spec` | every state side by side in Electric and Light with tokens (`meter-spec-d`), reduced motion, screen reader |
| `01-sign-up` | empty, typing with no score, under 8 (typing and pressed), weak, weak from their email, fair, good, strong, good with Show on, Clerk refused (breached, too weak); each in Electric and Light |
| `02-320-and-desktop` | empty, fair and breached at 320; empty, good and breached at desktop; Electric and Light |
| `03-reset` | New password on reset: empty, fair, good, breached (phone, Electric and Light), good at desktop |

## Rulings

| # | Item asked | Ruling | Boards |
|---|---|---|---|
| 1 | Empty field | The meter's resting state **replaces** "At least 8 characters.": four empty segments, no word, and three guides with open rings (*8 or more characters*, *A number or symbol*, *Not a common word, name, date or your email*). As The 99. | `01/empty-*` |
| 2 | Typing, no score yet | Looks like the resting meter: no word, no lit segment. Length and number-or-symbol tick live (no estimator needed); the third guide stays open until the estimator can judge it. No spinner, no shimmer. | `01/loading-*` |
| 3 | Four levels | One segment per level. **Weak** (1) and **Fair** (2) in quiet `--fg-muted` ink, with a line under the guides saying what to do, because Clerk will refuse them. **Good** (3) and **Strong** (4) in `--success`, no line. Red is kept for Clerk's answer, as The 99. | `01/weak-*`, `fair-*`, `good-*`, `strong-*` |
| 3a | Guides vs meter | The guides advise; only the estimator moves the meter. A passphrase with spaces leaves *A number or symbol* open and still reads Strong; a password with every guide ticked can still read Fair (the line explains it). | `01/strong-*`, `01/fair-*` |
| 3b | Own name or email | The email they typed goes to the estimator as their own words (no name at sign-up, decision 12 of the handoff). A password built from it reads Weak with the third guide open. | `01/weak-email-*` |
| 4 | Under 8, before the press | No word under 8, ever. The open length ring is the cue; nothing is red. On the press the existing device-side check shows "Use at least 8 characters." in the slot under the meter, and focus returns to the field. | `01/short-*`, `01/short-press-*` |
| 5 | Clerk's refusal | Breached and too weak take the slot under the meter in red (`role="alert"`, the existing lines). **The meter empties**, so it never sits at Good next to a refusal; the guides stay below. The next keystroke clears the line and the meter scores again. | `01/breached-*`, `01/refused-weak-*` |
| 6 | Show/Hide | Unchanged pill inside the field; shown state gets the signal tint (`aria-pressed`). Toggling never changes, resets or re-announces the meter. | `01/show-*` |
| 7 | Reduced motion | Default: the new segment fills over `--motion-fast` with `--motion-ease`, the word swaps at the end. Reduced motion: segments, colour and word swap in one frame; the app's blanket guard covers it, no new rule. | `00/reduced-motion-d` |
| 8 | Screen reader | One visually hidden `aria-live="polite"` line, spoken only when the word or the guide count changes, after 1 s without typing: "Fair, not strong enough yet. 3 of 3 done." / "Good. 3 of 3 done." / under 8: "1 of 3 done." It stays quiet while Clerk's alert shows. Segments and word are `aria-hidden`; the guides are a real list, each read with ", done" or ", not yet"; the field's `aria-describedby` names the list. | `00/screen-reader-d` |
| 9 | Reset (new password) | **Yes**, the same block under *New password* on the forgot flow's code step (`ForgotFlow.tsx` uses the same `PasswordField`). The estimator gets the email from the step before. | `03/*` |
| 10 | Settings change password | **No custom screen exists.** Settings opens Clerk's own profile modal (`AccountManagementRow.tsx`, `openUserProfile()`), so there is nothing of ours to put a meter on. See question 4. | none |
| 11 | Busy | While "Making your account…" holds the press, the meter and guides dim with the disabled field and don't change. | (base `signup-busy-m`) |

## Measurements

- Meter: 8px under the field. Four segments, 4px tall, radius 2, 4px gap, flex 1 each. Unlit `--border-strong`. Word 12.5/600, right-aligned, min-width 44px, 10px from the segments.
- Guides: 8px under the meter (or under the error line), 6px apart, 12.5px/1.45. Mark 14px round: open is a 1.5px `--fg-subtle` ring, met is `--signal` with a ✓ in `--bg`; top-aligned to the first line when a guide wraps (320). Met text `--fg`, open `--fg-muted`.
- Level line: 8px under the guides, 12.5px `--fg-muted`, weak and fair only.
- No new tokens. Light uses the themes.ts Light values (`--success #1F8A4F`, `--danger #C42940`, `--signal #0080A0`).

## Copy (DRAFT for copy-review)

| Key | String |
|---|---|
| `strength.guides.length` | 8 or more characters |
| `strength.guides.mix` | A number or symbol |
| `strength.guides.common` | Not a common word, name, date or your email |
| `strength.word.*` | Weak · Fair · Good · Strong |
| `strength.line.weak` | Too easy to guess. Try a longer one, or a few words together. |
| `strength.line.fair` | Not quite there. Add another word or a few more characters. |
| `strength.guideDone` / `guideNotYet` (sr-only) | , done / , not yet |
| `strength.announce` (sr-only) | {Word}. {n} of 3 done. For weak and fair: {Word}, not strong enough yet. {n} of 3 done. |
| `strength.announceShort` (sr-only) | {n} of 3 done. |
| `password.rule` | *Retired* on sign-up and reset (kept nowhere else today). |

Errors keep today's strings (`SIGN_UP_COPY.errors.tooShort`, `weak`, `breached`).

## For engineering

- The estimator's level must agree with Clerk: a password Clerk refuses as weak must never show Good or Strong. Confirm the weak/fair/good/strong boundaries against Clerk with a fixed list, as The 99 did (G1, G3 in its README).
- `AuthField` wires `aria-describedby` only to the error or hint today; it needs to name the guides list too, and the error line goes **between** the meter and the guides.
- The third guide ticks only from the estimator (no dictionary word, name, date, run, repeat, or match with the email).
- Count length in graphemes, the same count for the guide and the device-side gate, so the guide never ticks for a password the gate stops (The 99 `passwordLength`).

## Open questions

| # | Question | Recommended | Why |
|---|---|---|---|
| 1 | Does "Fair" read as acceptable when Clerk will refuse it? | Keep the four words from the brief, with the Fair line saying it's not there yet; let copy-review decide whether Fair becomes "Almost" or similar. | The level names are engineering's; the line carries the meaning either way. |
| 2 | Keep The 99's three guides, or the meter alone? | Keep the guides. | They are what makes it match The 99, and Hugh asked there for guidance from the empty field. |
| 3 | Good and Strong in `--success` green (The 99 uses its accent) | Green. | Concert Crawl's accent is pink and reads as brand, not "passes"; green matches the Applied chip. |
| 4 | Settings change password is Clerk's own modal. Build our own screen so it gets the same meter? | Not now; a separate brief if wanted. | Clerk's modal can't host our meter, and a custom screen is new account-settings scope (out of scope in the base handoff). |
| 5 | Sign-in's breached warning (amber, handoff decision 8) vs sign-up's red breached line | Leave both as they are. | At sign-in it's an account that needs a reset; at sign-up it's a choice the person can change right now. |
| 6 | Should the third guide name "your email" when the person signed up through Google? | N/A: Google sign-up has no password field. | Listed so it isn't asked again. |
