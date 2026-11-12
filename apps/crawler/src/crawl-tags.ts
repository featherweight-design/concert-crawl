// Searchable Sentry tags for a crawl failure. Ids are uuids, not personal
// data; an id that is not known at the call site is left off.
export function crawlTags(
  venueId: string | undefined,
  crawlRunId?: string,
): Record<string, string> {
  return {
    ...(venueId ? { venueId } : {}),
    ...(crawlRunId ? { crawlRunId } : {}),
  };
}
