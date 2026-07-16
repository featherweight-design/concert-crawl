// Shared formatting helpers for template modules. Dates render in Mountain
// Time (store UTC, display Denver) and invalid ISO strings collapse to null
// so templates fall back to their no-date copy instead of "Invalid Date".

const denverDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Denver',
})

// Compact "Jul 15" — used in preheaders where the year is noise (the charge is
// obviously recent). Year-bearing dates still use formatEmailDate.
const denverShortFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'America/Denver',
})

// Month name only ("July") for the receipt subject line.
const denverMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'America/Denver',
})

export const formatEmailDate = (isoDate: string | null): string | null => {
  if (isoDate === null) return null
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return denverDateFormatter.format(parsed)
}

export const formatShortDate = (isoDate: string | null): string | null => {
  if (isoDate === null) return null
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return denverShortFormatter.format(parsed)
}

export const formatMonthName = (isoDate: string | null): string | null => {
  if (isoDate === null) return null
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return denverMonthFormatter.format(parsed)
}

// User-supplied labels (e.g. gifter names) can carry newlines/control chars
// that spoof extra lines in the plain-text rendering — collapse them once so
// both HTML and text use the same clean value.
export const sanitizeInlineText = (value: string): string =>
  value
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Read at call time (not module load) — same convention as layout.ts, so
// staging/local emails never link prod.
export const planPageUrl = (): string =>
  `${process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000'}/me?section=plan`
