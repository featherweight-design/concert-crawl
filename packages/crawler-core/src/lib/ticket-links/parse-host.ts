// Pure URL → hostname normalization. Returns null for any input that the
// runtime URL parser refuses, so callers can fall through to a "no host
// available" branch without try/catch noise at every site.
export function parseHost(url: string | null | undefined): string | null {
  if (url == null || url === '') return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const hostname = parsed.hostname.toLowerCase()
  if (hostname === '') return null
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}
