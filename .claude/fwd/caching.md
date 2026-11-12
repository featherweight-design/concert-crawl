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
