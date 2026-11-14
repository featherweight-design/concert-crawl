# Emails v2 · Copy

Every string here is **DRAFT** and goes through the `copy-review` skill before it ships. **LIVE** marks a string kept from today’s email.
Braces are variables. No em dashes. US English. The source of truth is `C` in `design/emails-v2/em.py`.

## Shared shell

| Key | String | |
|---|---|---|
| `shell.legal` | Concert Crawl · Featherweight Design, LLC · Denver, CO | DRAFT |
| `shell.address` | {mailing address} | DRAFT |
| `shell.settings` | Email settings | DRAFT |
| `shell.accountNote` | This is an account email, so it can’t be turned off. We only send one when you ask for it. | DRAFT |
| `shell.neverAsk` | We’ll never ask you for this code by phone, text or email. | DRAFT |

## Invite

| Key | String | |
|---|---|---|
| `inv.subject` | You’re invited to Concert Crawl | LIVE |
| `inv.preheader` | Your invite code is inside. Help us test it before launch. | DRAFT |
| `inv.eyebrow` | Invite | DRAFT |
| `inv.title` | You’re invited to Concert Crawl | DRAFT |
| `inv.body` | Every show at 21 Denver venues in one calendar, crawled fresh every morning. We’re invite-only while we test it, and this code gets you in. | DRAFT |
| `inv.codeLabel` | Your invite code | DRAFT |
| `inv.stubOne` | Admits one | DRAFT |
| `inv.stubExpires` | Good until {date} | DRAFT |
| `inv.stubNoExpiry` | No expiry | DRAFT |
| `inv.cta` | Accept your invite | DRAFT |
| `inv.fallback` | Button not working? Go to {url} and type the code. | DRAFT |
| `inv.nextTitle` | What happens next | DRAFT |
| `inv.next1` | Enter the code | DRAFT |
| `inv.next2` | Make your account | DRAFT |
| `inv.next3` | Check your email | DRAFT |
| `inv.footer` | Someone on the Concert Crawl team invited {email}. Not expecting it? Ignore this email and nothing happens. | DRAFT |

## Weekly digest

| Key | String | |
|---|---|---|
| `dg.subject` | {n} shows this week by artists you follow | LIVE |
| `dg.subjectOne` | 1 show this week by an artist you follow | DRAFT |
| `dg.subjectZero` | A quiet week for your artists: two picks anyway | LIVE |
| `dg.preheader` | All of them playing Denver in the next 7 days. | LIVE |
| `dg.eyebrow` | Weekly digest | DRAFT |
| `dg.kicker` | This week in Denver · {range} | DRAFT |
| `dg.title` | {n} shows by artists you follow. | DRAFT |
| `dg.titleOne` | 1 show by an artist you follow. | DRAFT |
| `dg.sub` | All of them playing Denver in the next 7 days. | LIVE |
| `dg.zeroTitle` | A quiet one for your artists. | LIVE |
| `dg.zeroSub` | Nobody you follow is playing Denver this week. Here are two we think you’d click with anyway. | DRAFT |
| `dg.picks` | Based on your taste | LIVE |
| `dg.more` | +{n} more this week | LIVE |
| `dg.cta` | Open Concert Crawl | LIVE |
| `dg.view` | View | LIVE |
| `dg.watching` | Watching | DRAFT |
| `dg.soldOut` | Sold out | DRAFT |
| `dg.note` | You get this because you follow artists and turned on the weekly digest. | LIVE |
| `dg.off` | Turn off the weekly digest | LIVE |

## Code emails, shared

| Key | String | |
|---|---|---|
| `code.works` | Works for 10 minutes. Only the newest code works. | DRAFT |
| `code.from` | Asked for from {device} at {time}. | DRAFT |

## Sign-in code

| Key | String | |
|---|---|---|
| `si.subject` | Your Concert Crawl sign-in code | DRAFT |
| `si.preheader` | Enter it on the sign-in page. It works for 10 minutes. | DRAFT |
| `si.eyebrow` | Sign in | DRAFT |
| `si.title` | Your sign-in code | DRAFT |
| `si.body` | Enter this code on the sign-in page to finish signing in. | DRAFT |
| `si.safe` | Didn’t try to sign in? You can ignore this email. Nobody gets in without the code. | DRAFT |

## Verify email code

| Key | String | |
|---|---|---|
| `su.subject` | Confirm your email for Concert Crawl | DRAFT |
| `su.preheader` | Enter the code to finish making your account. | DRAFT |
| `su.eyebrow` | Verify email | DRAFT |
| `su.title` | Confirm your email | DRAFT |
| `su.body` | Enter this code to finish making your Concert Crawl account. | DRAFT |
| `su.safe` | Didn’t try to make an account? Ignore this email. No account is made without the code. | DRAFT |

## Password reset code

| Key | String | |
|---|---|---|
| `pr.subject` | Your Concert Crawl password reset code | DRAFT |
| `pr.preheader` | Enter it on the reset page, then choose a new password. | DRAFT |
| `pr.eyebrow` | Password reset | DRAFT |
| `pr.title` | Reset your password | DRAFT |
| `pr.body` | Enter this code on the reset page, then choose a new password. | DRAFT |
| `pr.safe` | Didn’t ask to reset it? Ignore this email. Your password stays the same. | DRAFT |

## New-device code

| Key | String | |
|---|---|---|
| `nd.subject` | Confirm it’s you: your Concert Crawl code | DRAFT |
| `nd.preheader` | Someone signed in with your password on a new device. | DRAFT |
| `nd.eyebrow` | New device | DRAFT |
| `nd.title` | Confirm it’s you | DRAFT |
| `nd.body` | Someone signed in with your password on a device we haven’t seen before. If that was you, enter this code to finish. | DRAFT |
| `nd.warnTitle` | Wasn’t you? | DRAFT |
| `nd.warnBody` | Don’t share the code. Someone knows your password, so reset it now. | DRAFT |
| `nd.warnLink` | Reset your password | DRAFT |

## Unsubscribe page

| Key | String | |
|---|---|---|
| `un.offTitle` | The weekly digest is off | DRAFT |
| `un.offBody` | You won’t get it anymore. Account emails, like sign-in codes, still come when you ask for them. | DRAFT |
| `un.offBack` | Changed your mind? Turn it back on in Settings. | DRAFT |
| `un.badTitle` | That link didn’t work | DRAFT |
| `un.badBody` | This link is broken or too old. You can still turn emails off in Settings → Notifications. | DRAFT |
| `un.downTitle` | Something went wrong | DRAFT |
| `un.downBody` | We couldn’t turn it off just now. Try the link again in a minute, or use Settings → Notifications. | DRAFT |
| `un.settings` | Open Settings | DRAFT |
| `un.home` | Go to Concert Crawl | DRAFT |
