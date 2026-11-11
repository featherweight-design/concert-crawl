import {
  DOING_KEYS,
  ERROR_ID_PATTERN,
  NOTE_MAX,
  type DoingKey,
  type ErrorReportBody,
} from './report';

// apps/web carries no zod dependency, so the boundary is narrowed by hand,
// the same way `lib/auth/intent.ts` and `lib/feature-flags.ts` do it. The
// API's own Zod schema checks the forwarded body again.

const PAGE_MAX = 2048;
const DEVICE_MAX = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDoingKey = (value: unknown): value is DoingKey =>
  DOING_KEYS.some((key) => key === value);

/**
 * The error page's report, as `/api/error-report` accepts it and as a saved
 * copy is read back from storage. A chip or a note is enough; neither is not.
 * Returns null for anything else, with the note trimmed.
 */
export const parseErrorReport = (value: unknown): ErrorReportBody | null => {
  if (!isRecord(value)) return null;
  const { errorId, doing, note, page, device } = value;

  if (typeof errorId !== 'string' || !ERROR_ID_PATTERN.test(errorId)) {
    return null;
  }
  if (typeof page !== 'string' || page.length > PAGE_MAX) return null;
  if (typeof device !== 'string' || device.length > DEVICE_MAX) return null;
  if (doing !== undefined && !isDoingKey(doing)) return null;
  if (note !== undefined && typeof note !== 'string') return null;

  const trimmed = note?.trim() ?? '';
  if (trimmed.length > NOTE_MAX) return null;
  if (doing === undefined && trimmed === '') return null;

  return {
    errorId,
    page,
    device,
    ...(doing === undefined ? {} : { doing }),
    ...(trimmed === '' ? {} : { note: trimmed }),
  };
};
