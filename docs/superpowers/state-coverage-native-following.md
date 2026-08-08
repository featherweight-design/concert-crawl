# Gate 1 — State reachability: native following

Run at the API→UI seam, **before PR 4's build started**, against the API surface PR 3
shipped (`#1524`, merged 2026-08-08).

Three questions per state, per epic-run Gate 1:

1. **Type** — is the triggering field present in the response type?
2. **Route** — does the route compute and assign it, or is it a `= null` stub?
3. **Runtime** — given how the component is actually mounted, seeded and cached, can the
   triggering condition ever be true?

Marks: ✅ reachable · ⚠️ type present, route or plumbing incomplete · ❌ not surfaced ·
🚫 unreachable at runtime.

---

## The surface PR 3 shipped

| Endpoint | Gating |
| --- | --- |
| `GET /v1/events?following=1` | `requireFeature('following')`; 401 anon, 403 `{code:'entitlement_required'}` |
| `GET /v1/me/artist-follows` | **Ungated by design** — a downgraded user must still see who they follow |
| `POST /v1/me/artist-follows/bulk` | `requireFeature('following')`, 1–50 slugs, per-slug result |
| `GET /v1/search/artists?q=` | `following: boolean` per result; **`q` is required** |
| `GET /v1/artists/:slug` | `following: boolean \| null` |

---

## PR 4 — scope chip

| State | Type | Route | Runtime | Mark |
| --- | --- | --- | --- | --- |
| `off` | ✅ | ✅ | ✅ | ✅ |
| `on` | ⚠️ | ✅ | ✅ | ⚠️ |
| `locked` | ✅ | ✅ | ✅ | ✅ |
| `absent` | ✅ | ✅ | ⚠️ | ⚠️ |

**`on` — ⚠️ type gap.** `apps/api/src/routes/events.ts:230,257,455` computes and returns
`followingApplied`, but `EventsListResponse` (`packages/types/src/index.ts:865`) does not
declare it. The banner cannot read the flag type-safely, and the plan's whole reason for the
flag existing — "the UI never claims a filter the API didn't apply" — depends on reading it.
→ **Fix in PR 4:** add `followingApplied?: boolean` to `EventsListResponse`.

**`locked` — ✅.** `following` is a real feature key (`packages/entitlements/src/index.ts:14`)
and `nfLocked()` is derived from `canUseFeature(state, 'following')`, so the chip reads the
entitlement rather than a tier string. `useEntitlement('following')` resolves the four
surfaces the shipped `TasteFilterChip` already switches on.

**`absent` — ⚠️ plumbing.** The plan requires this be "decided server-side and rendered
absent from first paint." The route can do it: `events/page.tsx` is a server component with
`export const dynamic = 'force-dynamic'` that already resolves a Clerk token and fans out
parallel SSR fetches (`tastePicksPromise` at line 214 is the exact precedent). But there is
no web-side fetcher for `/v1/me/artist-follows`, so nothing supplies the count.
→ **Fix in PR 4:** add `apps/web/src/lib/following.ts`, SSR-fetch the follow list alongside
`tastePicksPromise`, and pass the count down. **One fetch serves both** the chip's `absent`
decision and the shelf's `some`/`spotify` seed — do not fetch it twice.

Note the pattern boundary: `TasteFilterChip` resolves its entitlement **client-side** and
returns `null` until resolved ("no locked flash"). That handles `locked`, and the NF chip
should copy it. It does **not** handle `absent`, which is a data question, not an entitlement
one — hence the SSR seed. Copying the chip wholesale is the trap here.

### Decision D1 — `locked` beats `absent`

Unresolved in the plan: a free user with zero follows qualifies for both.

**`locked` wins. `absent` applies only to entitled users with zero follows.**

Reason: a non-entitled user's follow count is *necessarily* zero, because following is the
thing they cannot do. If `absent` were evaluated first it would swallow `locked` entirely,
`locked` would be unreachable for its whole audience, and the paywall's entry point on browse
would never render — a 🚫 manufactured by the precedence order itself. Evaluate entitlement,
then count.

---

## PR 4 — shelf

| Mode | Type | Route | Runtime | Mark |
| --- | --- | --- | --- | --- |
| `zero` (starter shelf) | ❌ | ❌ | 🚫 | 🚫 |
| `some` | ✅ | ✅ | ⚠️ | ⚠️ |
| `spotify` | ✅ | ✅ | ⚠️ | ⚠️ |

**`some` / `spotify` — ⚠️, same plumbing gap as `absent`.** `GET /v1/me/artist-follows`
returns everything both modes need: `FollowedArtist` carries `name`, `slug`, `photoUrl`,
`source` and `nextShow`. `source` discriminates the two modes, which is exactly the plan's
"Spotify is a `source` prop, not a second information architecture." Resolved by the same
`lib/following.ts` fetcher.

`slug: null` is a normal row — a Spotify-synced act never billed in Denver has no page. The
shelf renders the name unlinked. Not a separate mode.

### 🚫 The starter shelf has no data source

PR 4 Step 2's `zero` mode needs "followable artists with upcoming dates, shuffled per
session." Nothing can serve it:

- **No suggestions endpoint exists.** `artists-public.ts` exposes exactly one route,
  `GET /:slug`. PR 3 added none.
- **`GET /v1/search/artists` requires `q`** (`apps/api/src/routes/search.ts:112`), so it
  cannot answer an unqueried shelf.
- **The query is assigned to PR 8** (onboarding), four PRs after PR 4 needs it.
- **The spec'd ordering has no column.** Eng spec §9.2 orders suggestions "by follower
  count"; `grep -n "follower\|popularity" packages/db/src/schema/artists.ts` returns nothing.
  Artists are a projection off event billing strings, not an authored table with metrics.

A shelf built against this renders empty forever for every new user — the one audience the
slot exists to recruit.

### Decision D2 — pull the suggestion query forward into PR 4

Add `GET /v1/artists/suggestions?limit=` in PR 4, alongside the browse work. PR 8 then
extends the **same** endpoint with an optional `?genres=` array-overlap filter rather than
authoring a second one. This is the smaller change: PR 8's query is PR 4's query plus a
`WHERE`.

Candidate set matches what every other public artist read already asks: consumer-visible
events (`hidden_from_consumer = false`, `first_missing_at IS NULL`), an active venue, a date
`>= today` in Mountain Time, status in `upcoming | cancelled | postponed`, and the artist row
not `hidden`. Every suggestion is followable by construction, so the shelf never renders a
row whose button cannot work.

### Decision D3 — ordering substitute

No follower count exists and none is being added (the spec's own rule: artists carry no
authored attributes). Order by **count of upcoming consumer-visible Denver shows desc**, then
soonest date asc, then name asc for determinism.

That is a popularity proxy drawn from our own data rather than Spotify's, and it is the
better signal for this product anyway: the shelf is recruiting follows for *shows you can go
to*, not for global fame. The endpoint returns a candidate pool; the plan's "shuffled per
session" shuffle stays client-side, so the ordering picks the pool rather than the display
order.

---

## Actions taken before the PR 4 build

| # | Action | Where |
| --- | --- | --- |
| 1 | Add `followingApplied?: boolean` to `EventsListResponse` | `packages/types/src/index.ts` |
| 2 | Add `GET /v1/artists/suggestions?limit=` (D2, D3) + integration tests | `apps/api/src/routes/artists-public.ts` |
| 3 | Add `lib/following.ts`; SSR-seed the follow list once on browse | `apps/web/src/lib/`, `events/page.tsx` |
| 4 | Chip precedence: entitlement first, then count (D1) | PR 4 chip |

No item is escalated. D1 is settled by reachability rather than taste, and D2/D3 move work
that was already in the plan to the PR that first needs it.

## Amendment to the merged plan

PR 8 Step 2 no longer authors a query. It adds `?genres=` to the PR 4 endpoint and drops the
"ordered by follower count" clause, which describes a column that does not exist. Carried
into the run report.
