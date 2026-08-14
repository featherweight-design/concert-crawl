/**
 * A Clerk "user not found" surfaces as an error carrying HTTP 404. Only that
 * case means a genuinely deleted/missing account; any other failure (timeout,
 * 5xx) must propagate rather than masquerade as a missing user.
 */
export const isClerkNotFound = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null || !('status' in err)) {
    return false
  }
  const { status } = err
  return status === 404
}
