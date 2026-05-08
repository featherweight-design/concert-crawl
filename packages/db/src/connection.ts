/**
 * Returns true when the connection string points to a local Postgres instance.
 * Uses URL hostname parsing to avoid false positives from substring matches
 * (e.g. a remote host whose name happens to contain "localhost").
 * Falls back to includes() if the URL is malformed.
 */
export function isLocalConnectionString(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString)
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    )
  } catch {
    return (
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1')
    )
  }
}
