import {
  GLYPH_SVG_MAX_LENGTH,
  validateGlyphSvg,
  type GlyphSvgFailure,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { nearestCapacityType } from '@/components/admin/venues/details/details-rules';
import type { VenueHeroSetting } from '@/components/consumer/venue-glyph/definitions/venue-settings';
import type {
  GlyphDrafts,
  GlyphReference,
} from '@/lib/admin/glyph-drafts-schema';

const COPY = ADMIN_COPY.addVenue.icon;

/** The route takes at most three reference images (3d-1). */
export const REFERENCE_LIMIT = 3;
/** The route's cap on one image's base64 text: 1,000,000 characters is 750 KB of image. */
export const REFERENCE_MAX_CHARS = 1_000_000;

const REFERENCE_TYPES: ReadonlyArray<GlyphReference['mediaType']> = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** The route's media type for a file's, or null when it takes none. */
export const referenceType = (
  type: string,
): GlyphReference['mediaType'] | null =>
  REFERENCE_TYPES.find((allowed) => allowed === type) ?? null;

/** A reference image's `src` for its thumbnail, from the data already read. */
export const referenceSrc = (reference: GlyphReference): string =>
  `data:${reference.mediaType};base64,${reference.data}`;

/** An image's type checked: its media type, or the error to show. */
export type ReferenceCheck =
  | { ok: true; mediaType: GlyphReference['mediaType'] }
  | { ok: false; error: string };

export const checkReferenceFile = (file: {
  name: string;
  type: string;
}): ReferenceCheck => {
  const mediaType = referenceType(file.type);
  if (mediaType === null) {
    return { ok: false, error: COPY.references.wrongType(file.name) };
  }
  return { ok: true, mediaType };
};

/** The base64 part of a `data:` URL a FileReader produced. */
export const base64Of = (dataUrl: string): string =>
  dataUrl.slice(dataUrl.indexOf(',') + 1);

/** One icon on offer: a draft that passed the style check, or an uploaded SVG. */
export interface IconChoice {
  /** Its name on the list: "Glass and note". */
  label: string;
  svg: string;
  /** The line under the label: "From marquee-night.jpg". */
  caption: string;
}

/** The drafts the route returned, as the list shows them. */
export const choicesOf = (data: GlyphDrafts): IconChoice[] =>
  data.drafts.map((draft) => ({
    label: draft.label,
    svg: draft.svg,
    caption:
      draft.source.kind === 'reference'
        ? COPY.drafts.fromReference(draft.source.name)
        : COPY.drafts.fromName,
  }));

/**
 * "Hidden 3 of 4" and why, for the all-failed state. Null when nothing was
 * hidden. The reasons read as a sentence: "2 used fills and 1 ran off the grid".
 */
export const hiddenSummary = (
  hidden: GlyphDrafts['hidden'],
): { badge: string; body: string } | null => {
  const reasons = [
    hidden.fill > 0 ? COPY.drafts.reasonFill(hidden.fill) : null,
    hidden.offGrid > 0 ? COPY.drafts.reasonOffGrid(hidden.offGrid) : null,
    hidden.invalid > 0 ? COPY.drafts.reasonInvalid(hidden.invalid) : null,
  ].filter((reason): reason is string => reason !== null);
  const count = hidden.fill + hidden.offGrid + hidden.invalid;
  if (count === 0 || reasons.length === 0) return null;
  const joined =
    reasons.length === 1
      ? reasons[0]!
      : `${reasons.slice(0, -1).join(', ')} and ${reasons[reasons.length - 1]!}`;
  return {
    badge: COPY.drafts.hiddenBadge(count, hidden.total),
    body: COPY.drafts.failedBody(joined),
  };
};

const UPLOAD_ERRORS: Record<GlyphSvgFailure, string> = {
  fill: COPY.drafts.uploadFill,
  offGrid: COPY.drafts.uploadOffGrid,
  invalid: COPY.drafts.uploadInvalid,
};

/**
 * An uploaded SVG put through the same style check the drafts pass (the API
 * checks it again on save). `file` names it for the caption.
 */
export const uploadChoice = (
  text: string,
  file: string,
): { ok: true; choice: IconChoice } | { ok: false; error: string } => {
  if (text.length > GLYPH_SVG_MAX_LENGTH * 4) {
    return { ok: false, error: COPY.drafts.uploadTooLarge };
  }
  const checked = validateGlyphSvg(text);
  if (!checked.ok) return { ok: false, error: UPLOAD_ERRORS[checked.reason] };
  return {
    ok: true,
    choice: {
      label: COPY.drafts.uploaded,
      svg: checked.svg,
      caption: COPY.drafts.uploadedFrom(file),
    },
  };
};

/**
 * The hero setting a venue starts on: its Basics capacity type when set (the
 * six types and the six settings share names), else Street, the plainest.
 */
export const heroSettingGuess = (capacityType: string): VenueHeroSetting =>
  nearestCapacityType(capacityType) ?? 'street';

/** The picker's order on the desktop board and on the phone board. */
export const HERO_SETTINGS_DESKTOP: readonly VenueHeroSetting[] = [
  'street',
  'theater',
  'club',
  'outdoor',
  'arena',
  'gallery',
];
export const HERO_SETTINGS_PHONE: readonly VenueHeroSetting[] = [
  'street',
  'outdoor',
  'arena',
  'theater',
  'club',
  'gallery',
];
