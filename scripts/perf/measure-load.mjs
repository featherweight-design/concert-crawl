#!/usr/bin/env node
// Time to first byte and cache headers for a few public routes, N runs each.
// Anonymous requests only: it never sends a token. Run it before and after a
// perf change and paste the table in the PR body (caching skill, section 0).
//
//   node scripts/perf/measure-load.mjs <webBaseUrl> [runs] [apiBaseUrl]
//   node scripts/perf/measure-load.mjs https://staging.concertcrawl.app 3 https://api.staging.concertcrawl.app
//
// Server time per route comes from the PERF_TIMING=1 log lines (perf.api and
// perf.route); this script is the outside view: what a visitor waits for.

const [, , webBase, runsArg = '3', apiBase] = process.argv;
if (!webBase) {
  console.error('usage: measure-load.mjs <webBaseUrl> [runs] [apiBaseUrl]');
  process.exit(2);
}
const runs = Math.max(1, Number(runsArg) || 3);

const targets = [
  ['web', webBase, '/'],
  ['web', webBase, '/events'],
  ...(apiBase
    ? [
        ['api', apiBase, '/v1/events'],
        ['api', apiBase, '/v1/venues'],
        ['api', apiBase, '/v1/events/genres'],
      ]
    : []),
];

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

console.log(
  'kind  path                 run  status  ttfb_ms  x-vercel-cache  cache-control',
);
for (const [kind, base, path] of targets) {
  const times = [];
  for (let run = 1; run <= runs; run += 1) {
    const started = performance.now();
    const res = await fetch(`${base}${path}`, { redirect: 'manual' });
    const ttfb = performance.now() - started;
    await res.arrayBuffer();
    times.push(ttfb);
    console.log(
      [
        kind.padEnd(4),
        path.padEnd(20),
        String(run).padStart(3),
        String(res.status).padStart(6),
        ttfb.toFixed(0).padStart(8),
        (res.headers.get('x-vercel-cache') ?? '-').padEnd(14),
        res.headers.get('cache-control') ?? '-',
      ].join('  '),
    );
  }
  times.sort((left, right) => left - right);
  console.log(
    `      ${path}  median ${percentile(times, 0.5).toFixed(0)} ms, worst ${times[times.length - 1].toFixed(0)} ms`,
  );
}
