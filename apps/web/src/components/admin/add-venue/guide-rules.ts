import {
  GUIDE_CHIP_ORDER,
  type GuideChipKey,
  type VenueGuideChip,
} from '@concert-crawl/types';
import { hostAndPath } from './add-venue-rules';
import type {
  GuideDraftSection,
  GuideDraftSource,
  GuideDrafts,
} from '@/lib/admin/guide-drafts-schema';

/** The guide's fields as the step edits them: text only, the tip included. */
export interface GuideFields {
  insiderTip: string;
  chips: Record<GuideChipKey, string>;
}

/** A section's tag on the step: the draft's state, or the admin's own. */
export type GuideTag = 'drafted' | 'check' | 'blank' | 'yours';

export const EMPTY_FIELDS: GuideFields = {
  insiderTip: '',
  chips: {
    accessibility: '',
    parking: '',
    age_policy: '',
    bag_check: '',
    coat_check: '',
    will_call: '',
    food_drink: '',
    transit: '',
  },
};

/**
 * Fields after a Redraft: a section the admin has edited keeps their words, and
 * every other one (blank, or still the old draft untouched) takes the new
 * draft. The Insider tip is never drafted, so it never changes.
 */
export const mergeRedraft = (
  fields: GuideFields,
  before: GuideDrafts | null,
  after: GuideDrafts,
): GuideFields => {
  const chips = { ...fields.chips };
  for (const key of GUIDE_CHIP_ORDER) {
    const current = fields.chips[key];
    const old =
      before?.sections.find((sec) => sec.chipType === key)?.body ?? '';
    if (current.trim() === '' || current === old) {
      chips[key] =
        after.sections.find((sec) => sec.chipType === key)?.body ?? '';
    }
  }
  return { insiderTip: fields.insiderTip, chips };
};

/** The draft's section for a chip; undefined when the route sent none. */
export const sectionFor = (
  drafts: GuideDrafts | null,
  key: GuideChipKey,
): GuideDraftSection | undefined =>
  drafts?.sections.find((section) => section.chipType === key);

/**
 * The tag a section wears. An edited draft keeps its tag (the admin is still
 * checking it); a blank section the admin has written reads as theirs.
 */
export const tagOf = (
  drafts: GuideDrafts | null,
  key: GuideChipKey,
  text: string,
): GuideTag => {
  const section = sectionFor(drafts, key);
  if (section === undefined || section.state === 'blank') {
    return text.trim() === '' ? 'blank' : 'yours';
  }
  return section.state;
};

/** True once the admin has written anything: the step saves only then. */
export const anyWritten = (fields: GuideFields): boolean =>
  fields.insiderTip.trim() !== '' ||
  GUIDE_CHIP_ORDER.some((key) => fields.chips[key].trim() !== '');

/**
 * The guide PUT's body. It replaces the whole guide, so every section goes,
 * and a blank one is left out (a blank chip is the absence of a row).
 */
export const guidePayload = (
  fields: GuideFields,
): { insiderTip: string | null; chips: VenueGuideChip[] } => ({
  insiderTip: fields.insiderTip.trim() === '' ? null : fields.insiderTip.trim(),
  chips: GUIDE_CHIP_ORDER.flatMap((key): VenueGuideChip[] => {
    const body = fields.chips[key].trim();
    return body === '' ? [] : [{ chipType: key, body, isPlaceholder: false }];
  }),
});

/** The pages the route tried, as "host/path": the label for a source line. */
export const sourceLabel = (source: GuideDraftSource): string => {
  const { host, path } = hostAndPath(source.url);
  return path === '/' ? host : `${host}${path}`;
};

/** The first read page's host, for "Drafted from dazzledenver.com". */
export const draftedHost = (drafts: GuideDrafts): string | null => {
  const read = drafts.sources.find((source) => source.status === 'read');
  return read === undefined ? null : hostAndPath(read.url).host;
};

/** The path of a section's source ("/faq"), for its "From /faq" line. */
export const pathOf = (url: string): string => hostAndPath(url).path;
