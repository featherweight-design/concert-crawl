// Only http(s) URLs are safe to render as a clickable link — Zod's url()
// validator accepts javascript:/data: schemes, so a stored URL must be guarded
// at the render site before it reaches an href. The API rejects those schemes on
// write, but rows predating that validation can still hold one.
export function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
