// The same app as api/index.js, as a separate function so the cron routes get
// the longer maxDuration in vercel.json without raising it for every request.
// match-artists can run for minutes when Spotify rate-limits it.
export * from '../dist/vercel.js'
