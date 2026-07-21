// Guards an <a href> against non-navigational protocols (javascript:, data:,
// etc.) before rendering a link to a stored ticket URL. Only http/https pass.
export function isSafeHttpUrl(value: string | null): value is string {
  if (!value) return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
