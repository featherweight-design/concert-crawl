# Custom sign-in and sign-up · COPY

Every string on the boards, in one place. **DRAFT** strings are Design’s wording and go through the `copy-review` skill before they ship. **LIVE** strings already ship and are reused word for word. `{name}` is filled in at runtime. No em-dashes; locked vocabulary (Watching, Concerts, My shows) as in CLAUDE.md.

Keys are suggestions for `apps/web/src/app/sign-in/definitions/copy.ts`, `sign-up/definitions/copy.ts` and `auth/code/definitions/copy.ts`.

## Sign in · start

| Key | Text | Status |
|---|---|---|
| `in.eyebrow` | Sign in | DRAFT |
| `in.title` | Sign in | LIVE |
| `in.body` | Your Watching, your Concerts and your crews are where you left them. | DRAFT |
| `in.google` | Continue with Google | DRAFT |
| `in.or` | or | DRAFT |
| `in.emailLabel` | Email | DRAFT |
| `in.emailPlaceholder` | you@example.com | DRAFT |
| `in.continue` | Continue | DRAFT |
| `in.footBeta` | New here? Concert Crawl is invite-only for now. | DRAFT |
| `in.footBetaLink` | Use an invite code | DRAFT |
| `in.footLaunch` | New here? | DRAFT |
| `in.footLaunchLink` | Make an account | DRAFT |
| `in.emailInvalid` | Enter an email like you@example.com. | DRAFT |

## Sign in · password step

| Key | Text | Status |
|---|---|---|
| `pw.title` | Enter your password | DRAFT |
| `pw.body` | For {email}. | DRAFT |
| `pw.change` | Change | DRAFT |
| `pw.label` | Password | DRAFT |
| `pw.show` | Show | DRAFT |
| `pw.hide` | Hide | DRAFT |
| `pw.submit` | Sign in | DRAFT |
| `pw.forgot` | Forgot password? | DRAFT |
| `pw.codeInstead` | Email me a code instead | DRAFT |
| `pw.didntWork` | That email or password isn’t right. Try again, or email yourself a code. | DRAFT |
| `pw.busy` | Signing in… | DRAFT |

## Sign in · email code

| Key | Text | Status |
|---|---|---|
| `code.title` | Check your email | DRAFT |
| `code.body` | If {email} has an account, we sent it a 6-digit code. It works for 10 minutes. | DRAFT |
| `code.label` | 6-digit code | DRAFT |
| `code.submit` | Sign in | DRAFT |
| `code.resendIn` | Send a new code in {m}:{ss} | DRAFT |
| `code.resend` | Send a new code | DRAFT |
| `code.usePassword` | Use my password instead | DRAFT |
| `code.wrong` | That code isn’t right. Check the latest email and try again. | DRAFT |
| `code.expired` | That code has run out. Send a new one. | DRAFT |
| `code.sent` | New code sent. Use the newest email. | DRAFT |

## Sign in · new-device code

| Key | Text | Status |
|---|---|---|
| `dev.eyebrow` | New device | DRAFT |
| `dev.title` | Confirm it’s you | DRAFT |
| `dev.body` | You’re signing in somewhere we haven’t seen before, so we sent a 6-digit code to {email}. | DRAFT |
| `dev.submit` | Confirm and sign in | DRAFT |

## Sign in · breached password

| Key | Text | Status |
|---|---|---|
| `br.eyebrow` | Password reset needed | DRAFT |
| `br.title` | Time for a new password | DRAFT |
| `br.body` | This password showed up in a data breach on another site, so it can’t be used here anymore. Reset it to sign in. Your shows and settings stay as they are. | DRAFT |
| `br.button` | Reset password | DRAFT |

## Forgot password

| Key | Text | Status |
|---|---|---|
| `fp.title` | Reset your password | DRAFT |
| `fp.body` | Enter your email and we’ll send a 6-digit code. | DRAFT |
| `fp.send` | Send code | DRAFT |
| `fp.back` | Back to sign in | DRAFT |
| `fp.codeTitle` | Choose a new password | DRAFT |
| `fp.codeBody` | If {email} has an account, we sent it a 6-digit code. Enter it, then choose a new password. | DRAFT |
| `fp.newLabel` | New password | DRAFT |
| `fp.save` | Save and sign in | DRAFT |
| `fp.busy` | Saving… | DRAFT |
| `fp.doneTitle` | Password changed | DRAFT |
| `fp.doneBody` | You’re signed in. Taking you back now. | DRAFT |
| `fp.doneLink` | Continue | DRAFT |

## Password rule

| Key | Text | Status |
|---|---|---|
| `rule.min` | At least 8 characters. | DRAFT |

## Password errors (sign-up and reset)

| Key | Text | Status |
|---|---|---|
| `err.tooShort` | Use at least 8 characters. | DRAFT |
| `err.weak` | That password is too easy to guess. Try a longer one, or a few words together. | DRAFT |
| `err.breached` | That password has appeared in a data breach, so it can’t be used. Choose a different one. | DRAFT |

## Google

| Key | Text | Status |
|---|---|---|
| `g.busy` | Opening Google… | DRAFT |
| `g.returnTitle` | Signing you in | DRAFT |
| `g.returnBody` | Back from Google. One moment. | DRAFT |
| `g.cancelled` | Google sign-in didn’t finish. Try again, or use your email. | DRAFT |
| `g.refusedTitle` | No account for this Google sign-in yet | DRAFT |
| `g.refusedBody` | Concert Crawl is invite-only for now. If you have an invite code, enter it to make your account, then use Google from there. | DRAFT |
| `g.refusedButton` | Use an invite code | DRAFT |
| `g.waitlist` | Join the waitlist | DRAFT |
| `g.failed` | Google sign-in didn’t work. Try again, or use your email. | DRAFT |

## Google · consent on return

| Key | Text | Status |
|---|---|---|
| `gc.eyebrow` | One more step | DRAFT |
| `gc.title` | Agree to make your account | DRAFT |
| `gc.body` | Google confirmed {email}. Tick the box and we’ll make your Concert Crawl account. | DRAFT |
| `gc.submit` | Make my account | DRAFT |
| `gc.cancel` | Not now | DRAFT |

## Invite code

| Key | Text | Status |
|---|---|---|
| `inv.stepLabel` | Step 1 of 3 | DRAFT |
| `inv.heading` | Enter your invite code | LIVE |
| `inv.description` | Concert Crawl is invite-only right now. Your code is on the invite you got, the poster you scanned or the text a friend sent. | DRAFT |
| `inv.placeholder` | Your code | DRAFT |
| `inv.ariaLabel` | Invite code | LIVE |
| `inv.valid` | Looks good | LIVE |
| `inv.pasteHint` | Paste works too. We add the dashes. | DRAFT |
| `inv.prefillEyebrow` | Your invite | DRAFT |
| `inv.prefillHeading` | You’re invited | DRAFT |
| `inv.prefillBody` | Your code is filled in from the link. Check it, then continue. | DRAFT |
| `inv.continue` | Continue | DRAFT |
| `inv.pending` | Checking… | LIVE |
| `inv.notfound` | Code not found. Double-check for typos. | LIVE |
| `inv.used` | This code has already been redeemed. | LIVE |
| `inv.usedNext` | If it was yours, sign in instead. | DRAFT |
| `inv.expired` | This code has expired. | LIVE |
| `inv.expiredNext` | Ask whoever sent it for a new one, or join the waitlist. | DRAFT |
| `inv.ratelimit` | Too many attempts. Try again in a few minutes. | LIVE |
| `inv.waitlist` | Don’t have a code? Join the waitlist | LIVE |
| `inv.haveAccount` | Already have an account? | DRAFT |
| `inv.signIn` | Sign in | DRAFT |

## Sign up

| Key | Text | Status |
|---|---|---|
| `up.stepLabel` | Step 2 of 3 | DRAFT |
| `up.stepLabelLaunch` | Step 1 of 2 | DRAFT |
| `up.title` | Make your account | DRAFT |
| `up.body` | Your invite is in. Add your email and a password. | DRAFT |
| `up.bodyLaunch` | Every show in Denver, in one place. Add your email and a password. | DRAFT |
| `up.inviteChip` | Invite | DRAFT |
| `up.inviteApplied` | Applied | DRAFT |
| `up.inviteChange` | Use a different code | DRAFT |
| `up.emailLabel` | Email | DRAFT |
| `up.passwordLabel` | Password | DRAFT |
| `up.consent` | I agree to the {terms} and the {privacy}. | DRAFT |
| `up.consentBeta` | I agree to the {terms}, the {privacy} and the {beta}. | DRAFT |
| `up.terms` | Terms | DRAFT |
| `up.privacy` | Privacy Policy | DRAFT |
| `up.beta` | Private Beta Agreement | LIVE |
| `up.consentError` | Tick the box to agree before we make your account. | DRAFT |
| `up.submit` | Make my account | DRAFT |
| `up.busy` | Making your account… | DRAFT |
| `up.done` | You’re in | DRAFT |
| `up.google` | Continue with Google | DRAFT |
| `up.foot` | Already have an account? | DRAFT |
| `up.footLink` | Sign in | DRAFT |
| `up.legalDone` | Back to the form | DRAFT |

## Verify email

| Key | Text | Status |
|---|---|---|
| `ve.stepLabel` | Step 3 of 3 | DRAFT |
| `ve.title` | Check your email | DRAFT |
| `ve.body` | We sent a 6-digit code to {email}. Enter it to finish making your account. | DRAFT |
| `ve.submit` | Finish | DRAFT |
| `ve.wrongEmail` | Wrong email? Go back | DRAFT |
| `ve.haveAccount` | Already have an account with this email? Sign in instead. | DRAFT |

## Bot check

| Key | Text | Status |
|---|---|---|
| `bot.title` | One quick check | DRAFT |
| `bot.body` | This makes sure you’re a person and not a bot. It only shows up now and then. | DRAFT |

## Arriving with intent

| Key | Text | Status |
|---|---|---|
| `int.watch` | Sign in to watch {show} | DRAFT |
| `int.watchSub` | We’ll bring you back to the show and add it to Watching. | DRAFT |
| `int.follow` | Sign in to follow {artist} | DRAFT |
| `int.followSub` | We’ll bring you back and follow them for you. | DRAFT |
| `int.crew` | Sign in to join {crew} | DRAFT |
| `int.crewSub` | {host} invited you. You’ll land back on the invite. | DRAFT |
| `int.page` | Sign in to see {page} | DRAFT |
| `int.pageSub` | It’s only for your account. | DRAFT |
| `int.pageFallback` | Sign in to keep going | DRAFT |
| `int.watchToast` | You’re watching {show}. | DRAFT |
| `int.watchToastLink` | My shows | DRAFT |

## Loading

| Key | Text | Status |
|---|---|---|
| `load.aria` | Loading the sign-in form | LIVE |

## Sign-in blocked

| Key | Text | Status |
|---|---|---|
| `blk.eyebrow` | Sign in | LIVE |
| `blk.title` | The sign-in form didn’t load. | LIVE |
| `blk.sub` | Usually something is blocking it: a VPN, an ad blocker, or your browser’s shields. Switch one off and try again. | LIVE |
| `blk.retry` | Try again | LIVE |

## Offline

| Key | Text | Status |
|---|---|---|
| `off.banner` | You’re offline. What you typed is still here. Try again when you’re back online. | DRAFT |

## Rate limited

| Key | Text | Status |
|---|---|---|
| `rl.message` | Too many tries. Wait a minute, then try again. | DRAFT |
| `rl.countdown` | Try again in {m}:{ss} | DRAFT |

## Server error

| Key | Text | Status |
|---|---|---|
| `srv.failed` | Something went wrong on our side. Try again. | DRAFT |

## Page foot

| Key | Text | Status |
|---|---|---|
| `foot.terms` | Terms | DRAFT |
| `foot.privacy` | Privacy | DRAFT |
| `foot.proof` | 21 venues · crawled every morning | DRAFT |

## Shared

| Key | Text | Status |
|---|---|---|
| `back` | Back | DRAFT |

## Notes for copy review

- `inv.stepLabel` changes from the live “Step 1 of 2” to “Step 1 of 3”: code, account, then the email check.
- `inv.description` replaces the live line that names only the BETA-XXXX-XXXX shape, because named codes (4 to 20 letters and numbers) exist too.
- The live code-screen line “By continuing you agree to our Private Beta Agreement” moves into the sign-up checkbox (`up.consentBeta`) while the beta lasts. See README decision 3.
- `pw.didntWork`, `code.body` and `fp.codeBody` are worded so they read the same whether or not the email has an account. Keep that property in any rewrite.
- `blk.sub` is live and names no browser. Keep it that way.
