// A failing endpoint can answer with an HTML error page or an empty body, so
// the parsed payload is genuinely unknown — narrow it instead of asserting it.
export function apiErrorMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  if (!('error' in payload)) return null
  const { error } = payload
  return typeof error === 'string' ? error : null
}
