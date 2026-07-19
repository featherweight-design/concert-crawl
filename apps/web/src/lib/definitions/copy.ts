// Customer-facing strings for shared lib helpers (definitions pattern).

export const RELATIVE_TIME_COPY = {
  justNow: 'Just now',
  ago: (count: number, unit: string): string =>
    `${count} ${unit}${count === 1 ? '' : 's'} ago`,
  units: {
    minute: 'minute',
    hour: 'hour',
    day: 'day',
  },
} as const
