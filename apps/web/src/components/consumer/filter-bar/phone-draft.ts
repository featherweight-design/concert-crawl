// The phone Filters sheet (B+ B6b) stages its choices and applies them all at
// once with "Show N shows". The draft is the same four dimensions the URL
// holds, plus the crew lens, and it turns into page params by the same rules
// the bar's own writes follow: repeated keys for Where and Vibe, no offset,
// and a cleared window once nothing is left.

import {
  FILTER_DEFS,
  FILTER_ORDER,
  getActiveFilterCount,
  type FilterValues,
} from './filter-defs';

export interface FilterDraft {
  values: FilterValues;
  /** The crew lens, or null for Everyone. */
  crew: string | null;
}

export const EMPTY_FILTER_VALUES: FilterValues = {
  when: [],
  where: [],
  price: [],
  vibe: [],
};

/**
 * The param writes that apply a draft. `crew` is written only when the viewer
 * has a lens to set, so a flag-off viewer's URL is left as it was.
 */
export const draftUpdates = (
  draft: FilterDraft,
  withCrew: boolean,
): Record<string, string | readonly string[]> => {
  const updates: Record<string, string | readonly string[]> = {};
  for (const key of FILTER_ORDER) {
    const values = draft.values[key];
    updates[FILTER_DEFS[key].queryKey] =
      key === 'where' || key === 'vibe' ? values : (values[0] ?? '');
  }
  if (withCrew) updates['crew'] = draft.crew ?? '';
  // Clear all on the desktop bar drops an explicit window too.
  if (getActiveFilterCount(draft.values) === 0) {
    updates['from'] = '';
    updates['to'] = '';
  }
  return updates;
};

/** The page URL a draft would leave: every other param kept, offset dropped. */
export const draftParams = (
  base: URLSearchParams,
  draft: FilterDraft,
): URLSearchParams => {
  const params = new URLSearchParams(base);
  for (const [key, value] of Object.entries(draftUpdates(draft, true))) {
    params.delete(key);
    if (typeof value === 'string') {
      if (value) params.set(key, value);
    } else {
      for (const item of value) params.append(key, item);
    }
  }
  params.delete('offset');
  return params;
};

/** A single-select pill: a new pick replaces, the picked one taps off. */
export const pickSingle = (
  values: readonly string[],
  value: string,
): string[] => (values[0] === value ? [] : [value]);
