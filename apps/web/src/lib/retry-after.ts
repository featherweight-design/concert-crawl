// The server sends `Retry-After` in seconds. Both the data export and the
// artist follow read it, so the parse lives here once. A missing or unusable
// header falls back to the full hour the follow and export limits enforce.
export const FALLBACK_RETRY_AFTER_SECONDS = 3600;

export const parseRetryAfterSeconds = (header: string | null): number => {
  const seconds = Number(header);
  return header !== null && Number.isFinite(seconds) && seconds > 0
    ? seconds
    : FALLBACK_RETRY_AFTER_SECONDS;
};

// The moment a wait ends, as a clock time in the viewer's own timezone ("2:15
// PM"). Never Mountain Time: the wait belongs to the person tapping, not to
// Denver.
export const formatLocalClock = (at: Date): string =>
  at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
