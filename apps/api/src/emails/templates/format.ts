// Shared formatting helpers for template modules. Dates render in Mountain
// Time (store UTC, display Denver) and invalid ISO strings collapse to null
// so templates fall back to their no-date copy instead of "Invalid Date".

const denverDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Denver',
})

export const formatEmailDate = (isoDate: string | null): string | null => {
  if (isoDate === null) return null
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return denverDateFormatter.format(parsed)
}

// Read at call time (not module load) — same convention as layout.ts, so
// staging/local emails never link prod.
export const planPageUrl = (): string =>
  `${process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000'}/settings/plan`
