// `%` and `_` are LIKE metacharacters. Left unescaped, a search for "50%" would
// silently become a wildcard match rather than a literal one. Postgres treats
// backslash as the default escape character.
export const escapeLikePattern = (raw: string): string =>
  raw.replace(/[\\%_]/g, (char) => `\\${char}`);
