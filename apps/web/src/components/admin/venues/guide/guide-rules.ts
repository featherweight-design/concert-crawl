import {
  GUIDE_CHIP_ORDER,
  deriveGuidePublishState,
  type GuideChipKey,
  type VenueGuide,
  type VenueGuideChip,
} from '@concert-crawl/types';

/** A row on the Guide tab: the insider tip, then every chip. */
export type GuideSection = 'insider_tip' | GuideChipKey;

/** The insider tip first, then `GUIDE_CHIP_ORDER` (3b spec, Guide). */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  'insider_tip',
  ...GUIDE_CHIP_ORDER,
];

/**
 * Derived per row: there is no per-section column, only the guide's
 * `publishedAt` (ruling e). "Draft · check it" waits for 3d.
 */
export type GuideRowState = 'missing' | 'published' | 'draft' | 'cantDocument';

/** One section as the panel edits it. */
export interface SectionDraft {
  text: string;
  /** Accessibility only: the honest placeholder. */
  cantDocument: boolean;
}

const chipOf = (
  guide: VenueGuide,
  key: GuideChipKey,
): VenueGuideChip | undefined =>
  guide.chips.find((chip) => chip.chipType === key);

export const sectionDraft = (
  guide: VenueGuide,
  section: GuideSection,
): SectionDraft => {
  if (section === 'insider_tip')
    return { text: guide.insiderTip ?? '', cantDocument: false };
  const chip = chipOf(guide, section);
  if (chip?.isPlaceholder) return { text: '', cantDocument: true };
  return { text: chip?.body ?? '', cantDocument: false };
};

export const rowState = (
  guide: VenueGuide,
  section: GuideSection,
): GuideRowState => {
  const { text, cantDocument } = sectionDraft(guide, section);
  if (cantDocument) return 'cantDocument';
  if (text.trim().length === 0) return 'missing';
  return guide.publishedAt === null ? 'draft' : 'published';
};

/** "{N} of 8 published": the chips only, never the insider tip (row 24). */
export const publishedCount = (guide: VenueGuide): number =>
  GUIDE_CHIP_ORDER.filter((key) => rowState(guide, key) === 'published').length;

/** The publish gate the API runs: Accessibility written, or Can't document yet. */
export const publishBlocked = (guide: VenueGuide): boolean => {
  const access = sectionDraft(guide, 'accessibility');
  return (
    deriveGuidePublishState({
      accessibilityBody: access.text,
      accessibilityPlaceholder: access.cantDocument,
    }).kind === 'blocked'
  );
};

/** The Guide tab's dot: the guide is unpublished, or Publish is blocked. */
export const guideNeedsYou = (guide: VenueGuide): boolean =>
  guide.publishedAt === null || publishBlocked(guide);

/**
 * The whole guide with one section replaced: the API's PUT takes the whole
 * guide, so every other section is sent back as it is. A blank section is
 * left out, since a blank chip is the absence of a row.
 */
export const withSection = (
  guide: VenueGuide,
  section: GuideSection,
  draft: SectionDraft,
): VenueGuide => {
  const text = draft.text.trim();
  if (section === 'insider_tip')
    return { ...guide, insiderTip: text.length > 0 ? text : null };
  const chips = GUIDE_CHIP_ORDER.flatMap((key): VenueGuideChip[] => {
    if (key !== section) {
      const chip = chipOf(guide, key);
      return chip ? [chip] : [];
    }
    if (draft.cantDocument)
      return [{ chipType: key, body: '', isPlaceholder: true }];
    return text.length > 0
      ? [{ chipType: key, body: text, isPlaceholder: false }]
      : [];
  });
  return { ...guide, chips };
};
