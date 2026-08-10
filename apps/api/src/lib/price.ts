// Numeric columns come back from the driver as strings; every list surface has
// to turn one into a display price. Four near-identical private copies existed
// before this file, differing only in punctuation, which is how one of them
// would eventually have started disagreeing with the rest.

/** `null` for absent, empty, or unparseable input — all of which read "Price TBD". */
export const parsePrice = (raw: string | null): number | null => {
  if (!raw) return null
  const parsed = Number.parseFloat(raw)
  return Number.isNaN(parsed) ? null : parsed
}
