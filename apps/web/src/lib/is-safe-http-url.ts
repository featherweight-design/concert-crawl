// Guards an <a href> against non-navigational protocols (javascript:, data:,
// etc.) before rendering a link to any stored URL — ticket, venue website,
// price, or report evidence. Only http/https pass.
export function isSafeHttpUrl(
  value: string | null | undefined,
): value is string {
  if (!value) return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
