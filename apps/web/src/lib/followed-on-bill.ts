import { canonicalizeArtist } from '@concert-crawl/types';

/**
 * The names on a bill the viewer follows, in bill order (headliner first),
 * as printed. Empty when they follow nobody on it.
 */
export function followedOnBill(
  followed: ReadonlySet<string>,
  headliner: string,
  supports: readonly string[],
): string[] {
  if (followed.size === 0) return [];
  return [headliner, ...supports].filter((name) =>
    followed.has(canonicalizeArtist(name)),
  );
}
