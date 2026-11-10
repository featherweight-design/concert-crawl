// Shared formatting helpers for template modules.

// User-supplied labels (e.g. gifter names) can carry newlines/control chars
// that spoof extra lines in the plain-text rendering — collapse them once so
// both HTML and text use the same clean value.
export const sanitizeInlineText = (value: string): string =>
  value
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
