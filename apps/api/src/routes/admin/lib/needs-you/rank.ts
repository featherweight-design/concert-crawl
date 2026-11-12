import type { NeedsYouItem } from '@concert-crawl/types';

// CALL FOR HUGH TO CONFIRM: the queue is ordered by the date a fan will next
// see the affected show, soonest first, items with no date last. Ties go to the
// item more fans are watching, then to the key so the order is stable. A batch
// ranks by its soonest show. If "what is most urgent" should weigh watchers
// above the date, this one comparator is the only place to change.
export const compareNeedsYou = (
  left: Pick<NeedsYouItem, 'fanDate' | 'watchers' | 'key'>,
  right: Pick<NeedsYouItem, 'fanDate' | 'watchers' | 'key'>,
): number => {
  if (left.fanDate !== right.fanDate) {
    if (left.fanDate === null) return 1;
    if (right.fanDate === null) return -1;
    return left.fanDate < right.fanDate ? -1 : 1;
  }
  if (left.watchers !== right.watchers) return right.watchers - left.watchers;
  if (left.key === right.key) return 0;
  return left.key < right.key ? -1 : 1;
};

export const rankNeedsYou = <Item extends NeedsYouItem>(
  items: readonly Item[],
): Item[] => [...items].sort(compareNeedsYou);
