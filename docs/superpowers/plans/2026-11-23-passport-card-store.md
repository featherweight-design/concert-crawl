# Passport share card store (Vercel Blob, render once, serve stored)

Status: plan only. Hugh approved the spend on 2026-11-23 (option B in the pre-warm follow-up). Nothing in this plan is built, and no infra is provisioned. The build is three PRs, listed under "PR boundaries".

## Problem

The Passport share card is a 2160 x 2160 PNG drawn by satori inside `apps/web/src/app/passport/[ratio]/route.tsx`. A cold render takes about 12 to 15 seconds on staging. `usePassportShare` fetches the PNG on mount so that `navigator.share` can run inside the tap's user activation, which means the Share and Save row says "preparing" for the whole render on a cold instance.

The only cache is `render-cache.ts`, an in-process LRU (16 entries) keyed on the card's content. It works for repeat requests that hit the same warm instance (340 to 670 ms, almost all of it the two API calls). It does nothing for the first request after a deploy, an instance recycle, a different instance, or a changed stamp.

## What #806 and #812 taught

- **#806** (`feat/passport-share-prewarm`, merged 9cf3f55) moved the render into a shared `planPassportCard` and had the Passport page call it inside `after()` to warm the render cache for the stored profile theme.
- **It did not work.** Staging after-measures were still cold: mount fetch about 14 to 15 s on a fresh deploy, and 15 s again with the profile theme forced to match. The page request and the image request do not share an in-process cache. They land on different function instances or different module scopes, so a warm in one is invisible to the other.
- **#812** reverted both commits (8e9732e62 and 9cf3f5599; a revert needs both). The per-account render cache 3e11ba0b8 stayed.
- **Theme mismatch.** A fresh browser asks for `?theme=electric` while the stored profile theme can differ, so even a perfect warm for the profile theme would have missed the key the page actually requests. The key includes the resolved theme tokens, so theme is part of "the same card".
- **Conclusion carried into this plan:** any fix has to live in storage that every instance reads, and it has to be keyed on the card's content, not on who warmed it. That is what a blob store is. Do not retry an in-process warm.

## Measured card size

Method: the real `PassportCard` at `PASSPORT_PRINT_MODE` and `PASSPORT_PRINT_SCALE` (2), rendered through `ImageResponse` with the real share fonts, from a scratch route on a lane dev server (never committed, removed after). The shows were synthetic (placeholder names, 16 rotating venue slugs, four genres), so glyph and text differences from real data will move the numbers slightly. A signed-in staging measure is a to-do for build PR S1, which should re-measure with one real account and update this table.

| Shows on the card              | PNG bytes         | Render time (dev, includes first compile) |
| ------------------------------ | ----------------- | ----------------------------------------- |
| 5                              | 411,841 (0.41 MB) | 7.4 s                                     |
| 15 (a full wall)               | 922,929 (0.92 MB) | 18.8 s                                    |
| 60 (wall caps, `+N more` tile) | 934,835 (0.93 MB) | 19.2 s                                    |
| 15, jade theme                 | 922,770 (0.92 MB) | 19.1 s                                    |

Dimensions 2160 x 2160. A full wall is about 0.92 MB and the wall caps at 15 stamps plus the more tile, so the **planning figure is 0.93 MB per card**, which is also the worst case. Dev render time is not the production figure (cold staging is 12 to 15 s); it is shown only to show the render cost is flat once the wall is full.

## Monthly cost at 1,000 and 10,000 cards

Prices (from the brief): storage $0.023 per GB-month, simple operations $0.40 per million, advanced operations $5.00 per million, transfer $0.05 per GB.

Assumptions, all deliberately on the high side:

- One live card per account (the store keeps up to 3 per account, see "Hard cap", but steady state is 1).
- 0.93 MB per card, decimal GB.
- Each account's stamps change and the card is re-stored 4 times a month. Each store is one put (advanced) and one delete of the superseded object (counted as advanced, to be safe).
- Each account opens the Passport page 20 times a month. Each open is one head and one read (simple operations) and one full 0.93 MB transfer.
- No browser cache credit (see the note below the table).

| Line                                       | 1,000 cards     | 10,000 cards     |
| ------------------------------------------ | --------------- | ---------------- |
| Storage (0.93 GB / 9.3 GB)                 | $0.02           | $0.21            |
| Puts, 4,000 / 40,000 (advanced)            | $0.02           | $0.20            |
| Deletes, 4,000 / 40,000 (advanced)         | $0.02           | $0.20            |
| Heads and reads, 40,000 / 400,000 (simple) | $0.02           | $0.16            |
| Transfer, 18.6 GB / 186 GB                 | $0.93           | $9.30            |
| **Total per month**                        | **about $1.01** | **about $10.07** |

Transfer is about 92% of the bill at both sizes. Everything else rounds to cents. Two things pull transfer down and neither is assumed above:

- The stored object is content-addressed, so it can be served with a one-year immutable `Cache-Control`. A returning visitor on the same card reads it from the browser cache, not from the store.
- The PNG is 0.92 MB because it is a large truecolor image. A palette-quantised export could be a fraction of that, but that is a pixel-fidelity decision and belongs to Design. Not in this plan.

The store does not remove the render cost. Renders still happen once per card version, on the first request after a change. What it removes is the repeat renders (every cold instance, every deploy), so function time goes down, not up.

## Design

### The key: content, not deploy

Reuse the idea in `passportCacheKey`: a sha256 over what the card is drawn from. The store key is `passport/<userId>/<hash>.png` where the hash covers `[PASSPORT_CARD_VERSION, userId, ratio, handle, year, tokens, shows]`.

It deliberately leaves out `BUILD_STAMP` (the deployment id) that the in-process key uses. The in-process cache is allowed to churn on every deploy because it is free. A blob store that retired every card on every deploy would re-render and re-store every active account after each of the repo's many daily deploys. Instead the card carries an explicit `PASSPORT_CARD_VERSION` constant in `passport-request.ts`, and a unit test pins a hash of `PP_MODES` and the print scale so that changing the geometry fails CI until the constant is bumped. Changing only the card's JSX (not the modes) is the one gap; the build PR must add a note to `PassportCard.tsx` and to the PR template's design checklist that a card change bumps the version.

`passportCacheKey` is split into a content hash (shared, no deploy id) and the existing in-process key (content hash plus `BUILD_STAMP`). Both stay in `render-cache.ts`.

### The read path

The route keeps doing what it does today up to the key: session check, `fetchMe` and `fetchHistory`, theme resolution, the key, the ETag and 304. Then:

1. `head()` the store for the key. A hit returns a 302 to the stored object's URL with `Cache-Control: private, max-age=300`, `Vary: Cookie` and the ETag, exactly the headers the route sends today. This is the fast path: about the cost of the two API calls plus one head, so roughly 0.5 s instead of 12 to 15 s.
2. A miss falls through to the existing `renderOnce` path, then writes the bytes to the store (see "The write path") and responds as today.
3. Any store error (head, put, list, delete, a missing token) is logged and treated as a miss. The store can never make the route fail; at worst the route behaves exactly like today.

Redirect, not proxy. A proxied read would put the 0.93 MB through our function and bill Fast Data Transfer on top. The cross-origin `fetch()` in `usePassportShare` must follow the 302 and read the body, so build PR S1 starts by confirming the store's CORS headers allow that. If it does not, the fallback is to proxy, with the cost note above.

### The write path

Lazy read-through, by the route, on a miss. No write-through from the attendance change: the API app cannot render satori, and a Next-side trigger from the "I was there" action is a possible later optimisation, not part of this plan. Consequence to state plainly: **the first view after a stamp change is still cold (12 to 15 s). Every view and every share after it is fast.** The existing "preparing" state covers that first view. The page does not warm the card (that was #806).

After a successful put, in the same request (`after()`), the route lists the account's prefix and deletes everything except the 3 newest objects. The list runs only on a miss, so it costs one advanced operation per store, already counted above.

### Invalidation

There is nothing to invalidate by hand, because the key is the content.

| Change                                                               | Effect                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| A stamp added, removed or edited (artist, venue, date, genre, price) | New hash, old object superseded and pruned                      |
| Handle changed                                                       | New hash                                                        |
| Theme changed (profile or `?theme=` preview)                         | New hash per theme, up to the per-account cap                   |
| Year rolls over (1 January, Mountain Time)                           | New hash, every active account re-renders once on its next view |
| Card geometry or design changed                                      | Bump `PASSPORT_CARD_VERSION`, new hash for everyone             |
| Deploy                                                               | Nothing (the point of leaving `BUILD_STAMP` out)                |
| Account deleted                                                      | The prefix `passport/<userId>/` is deleted (build PR S3)        |

A card that is no longer reachable by any request (an abandoned account, an old version) stays in the store until the account deletes or a sweep removes it. S3 adds an admin-run sweep for objects older than 90 days, with a dry run, because without it the orphan count only goes up.

### Hard cap

The store must not be able to run away. There is no native spend cap on the store, so the cap is built from four layers:

1. **Size:** the route refuses to store a PNG over 2 MB (more than twice the planning figure). A card that large is a bug, and it is served from the in-process path only.
2. **Per account:** at most 3 live objects (the profile theme, one preview theme, one spare), enforced by the prune after every put. Total bytes are therefore bounded by accounts x 3 x 2 MB in the worst case (60 GB, $1.38 a month in storage, at 10,000 accounts).
3. **Rate:** the prune's list already returns each object's upload time. If the account's newest object is under 60 seconds old, the route skips the put. This bounds a preview-picker flick through every theme and is free, because the list happens anyway.
4. **Kill switch and spend alarm:** one environment variable turns the store off and the route reverts to today's behaviour once the variable is changed on the platform. Separately, Hugh sets a usage alert on the store (recommend $5 a month, five times the 1,000-card figure) so transfer, the real cost driver, is seen before it is bought.

The worst case of layers 1 to 3 is a storage bill of cents to a couple of dollars. The only line that scales with traffic is transfer, and the alarm in layer 4 is what covers it.

### Privacy

The card is personal: a handle and a year of attended venues and artists. Today it is served `private` with `Vary: Cookie` and never reaches a shared cache. A stored object changes that:

- If the store supports private objects, use them, and the route serves a short-lived signed URL in the 302. Build PR S1 confirms whether it does and at what cost.
- If it does not, the objects are public but not enumerable. The pathname holds a 64-hex content hash that includes the account id and every stamp, so a URL cannot be guessed or derived by someone who does not already hold the card. The user already shares this image when they tap Share, so a URL that only the signed-in owner is ever given has the exposure of a card the user chose to post. This is the recommendation, with the privacy call flagged to Hugh below.
- The 302 itself keeps `Cache-Control: private` and `Vary: Cookie`, so the pointer is never shared even where the object is long-lived.
- Account deletion removes the prefix. If an account-deletion path exists in the API, the build wires a call to it; if it does not, S3 records that as a gap for Hugh rather than inventing a deletion flow.

### What stays the same

- The route, ratio list, headers, ETag and 304 behaviour, the 400/401/502 responses, and the in-process `renderOnce` dedupe.
- `usePassportShare`, the Passport page, the card and every string. **No UI change, no copy change, no release note.** Feature-acceptance does not apply because no route or viewport changes; the proof is a measured before and after of the cold and warm fetch on staging.

## PR boundaries (for the build, not this PR)

One PR at a time, each from fresh `main`, none stacked, each well under 20 files.

| PR  | Branch                        | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `feat/passport-store-wrapper` | `@vercel/blob` dependency; `lib/passport/passport-store.ts` (head, put, list, prune, delete, all failing soft, all taking the token from env and doing nothing when it is absent); the content-hash split in `render-cache.ts`; `PASSPORT_CARD_VERSION` and the `PP_MODES` pin test; unit tests against a fake; the CORS and private-access spike written up in the PR body; `.env.example` and `docs/runbooks/production-launch.md` entries. No route change. |
| S2  | `feat/passport-store-route`   | Route read-through, write-after, prune, rate rule, size rule, kill switch; route tests for hit, miss, store failure, kill switch and the 304; a staging before and after of the mount fetch and an explicit fetch.                                                                                                                                                                                                                                             |
| S3  | `feat/passport-store-cleanup` | Account-deletion prefix delete (or the recorded gap), the admin sweep with a dry run, an error/latency log line per store call, a short runbook.                                                                                                                                                                                                                                                                                                               |

**Order is S1, S2, S3.** S2 cannot merge to staging until the store exists, so Hugh provisions it between S1 and S2.

Risk class: S1 and S2 touch an API route and a new vendor dependency, so both get `/code-review medium` plus the risk-checklist pass under `## Copilot off`. S3 touches an admin action and deletes data, same treatment.

## Open calls for Hugh

1. **Provision the store.** A Vercel Blob store on staging and prod with its read-write token as a Vercel env var. Spend is approved; the provisioning is a human infra step and an env change, so it is not done by a lane. Needed before S2 reaches staging.
2. **Access mode.** Recommendation: public, unguessable pathname, unless S1's spike finds private objects are available at no extra cost, in which case use private. This is the privacy call the build should not make alone.
3. **Kill switch.** Recommendation: a plain environment variable read by the store wrapper, not an entry in the feature-flag system. Say so if it must be a flag.
4. **Usage alert.** Recommendation: $5 a month on the store.
5. **Not in this plan:** shrinking the PNG (palette quantisation, a smaller preview for the page) would cut transfer, the only cost that scales, by a large factor. It changes pixels, so it is Design's call, and the page's preview and the share file would need to be separate images.

## Next

Hugh's answers to 1 to 3, then S1.
