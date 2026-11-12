# Concert Crawl: caching rules

These add to the fwd `caching` skill and win where they conflict. The shape here: the Next.js
web app on Vercel calls a separate Hono API project, which reads Neon. Every server-side read is
a web-to-API hop.

## Measuring (skill section 0)

- **Server time per route.** Set `PERF_TIMING=1` on the web deployment. It logs one JSON line per
  web-to-API call (`"event":"perf.api"`: path without query values, authed or not, status,
  `ttfbMs`, `totalMs`) and one per instrumented page render (`"event":"perf.route"`: `events`,
  `event-detail`). Read them from the Vercel runtime logs, filtered on `perf.`. Add a page with
  `export default perfRoute('<name>', Page)` from `apps/web/src/lib/perf/timing.ts`. It never logs
  a token, a header or a query value.
- **The outside view.** `node scripts/perf/measure-load.mjs <webBaseUrl> [runs] [apiBaseUrl]`:
  anonymous TTFB, `x-vercel-cache` and `Cache-Control` for the landing page, Browse and the public
  API reads. Paste the before and after table in the PR body.
- **Tail latency.** Sentry `http.server` p50 and p95 for the API project.
- **Calls on mount.** Count the requests a page fires as it loads, signed in; the same resource
  twice is a bug.

## The shared catalog cache (web, server side)

- **Helper:** `publicCatalogGet(path)` in `apps/web/src/lib/catalog-cache.ts`. Public, same-for-everyone
  reads only (events list and detail as a logged-out visitor, venues, genres). It goes through
  `anonymousRequest`, which sends no `Authorization` and no `x-service-key`, so a personal field cannot
  reach a cached body. A signed-in read of anything with an overlay (`isWatching`, followed artists,
  `/watchers`) stays on `apiClient` with the token and is never cached here.
- **Key:** one `x-catalog-key` request header the API ignores (Next keys a fetch on URL plus headers):
  `g<generation>.b<deployment id>.d<Mountain date>`. The generation is `GET /v1/catalog/generation`
  (the later of the newest crawl run and newest audit row, derived, `no-store`), held 60 seconds by the
  web and `"0"` if unreadable. Ceiling one hour, tag `catalog`.
- **Invalidation at the writer:** the crawler's post-crawl `POST /api/revalidate` body carries
  `tags: ['catalog']` (dormant until `REVALIDATE_SECRET` is set, which is why the stamp is the main
  mechanism). An admin edit moves the stamp through its audit row.
- **Adding a read:** prove it first with `node apps/e2e/src/perf/public-vs-personal.mjs` (staging; any
  path that differs by caller is personal). The proof account has no watches or follows, so also read
  the route for `getAuth` overlays. Then add it to the helper's callers and say so in the PR.
- **Never** add a switch for it, never use `experimental.staleTimes`, never cache a read under a user.
