// Category presentation for the notification panel (#737), ported verbatim
// from design_handoff_in_app_notifications/notifications-data.jsx
// (CATEGORY_MAP, R2).
//
// THE SYSTEM: ink encodes VALENCE, glyph encodes EVENT.
//
//   --danger    bad news you can't act on      watch.cancelled
//   --warning   changed on you / closing       watch.postponed · contest.resolved
//                                              contest.needs_info (B19a boards)
//   --success   good news                      watch.backonsale · watch.pricedrop
//                                              artist.report_fixed
//   --accent    discovery, sold out            artist.new_show · crew.* ·
//                                              watch.soldout (B19a boards)
//
// The three `crew.*` categories share one ink and one glyph on purpose: they
// are not three kinds of news, they are one social channel, and a crew row
// normally shows the crew's own patch in place of the tile anyway (see
// lib/crew-meta.ts). The tile and label here are the fallback for a row whose
// crew metadata did not survive.
//
// The five `watch.*` categories are deliberately NOT collapsed into one
// "Watching" class: cancelled and backonsale are opposite news. Do not
// "simplify" this, and do not re-assign one ink per category — eight
// distinguishable inks do not exist.
//
// `contest.resolved` stays neutral per the Phase 8.5 lock (a price check is a
// price update, not a callout). `contest.needs_info` diverges to --signal on
// purpose: neutrality governs VERDICTS, and an outstanding task is not one.
//
// The ink is used ONLY on non-text surfaces — the tile glyph, the 2px unread
// rail, and the unread dot. Row text is never tinted (WCAG 1.4.3: these are
// 3:1-class tokens).

import type { NotificationCategory } from '@/lib/notifications';
import { isNotificationCategory } from '@/lib/notifications';
import type { GlyphName } from '../glyphs';

export interface CategoryPresentation {
  /** Spelled-out eyebrow — the not-colour-alone half of 1.4.1. */
  label: string;
  /** A CSS custom property reference; graphics only, never text. */
  ink: string;
  glyph: GlyphName;
  /** Leads the row's accessible name, e.g. "Show cancelled. …". */
  verb: string;
}

/**
 * Exhaustive over the shipped union, so a ninth category added to
 * `NotificationCategory` is a compile error here rather than a blank tile in
 * production.
 */
export const CATEGORY_MAP: Record<NotificationCategory, CategoryPresentation> =
  {
    'watch.cancelled': {
      label: 'Shows',
      ink: 'var(--danger)',
      glyph: 'cancelled',
      verb: 'Show cancelled',
    },
    'watch.postponed': {
      label: 'Shows',
      ink: 'var(--warning)',
      glyph: 'postponed',
      verb: 'Show moved',
    },
    'watch.soldout': {
      label: 'Shows',
      // B19a (`notif-shows-m`): sold out is the accent tag, not a warning.
      ink: 'var(--accent)',
      glyph: 'tag',
      verb: 'Show sold out',
    },
    'watch.backonsale': {
      label: 'Shows',
      ink: 'var(--success)',
      glyph: 'backonsale',
      verb: 'Tickets back on sale',
    },
    'watch.pricedrop': {
      label: 'Prices',
      ink: 'var(--success)',
      glyph: 'pricedrop',
      verb: 'Price drop',
    },
    'contest.resolved': {
      label: 'Prices',
      // B19a (`notif-prices-m`): both price check rows wear the warning tag.
      ink: 'var(--warning)',
      glyph: 'tag',
      verb: 'Price check result',
    },
    'contest.needs_info': {
      label: 'Prices',
      ink: 'var(--warning)',
      glyph: 'tag',
      verb: 'Price check needs you',
    },
    'artist.new_show': {
      label: 'Artists',
      ink: 'var(--accent)',
      glyph: 'newshow',
      verb: 'New Denver date',
    },
    // Good news about a page the viewer reported, so success ink; the label is
    // shared with artist.new_show because both are the Artists channel.
    'artist.report_fixed': {
      label: 'Artists',
      ink: 'var(--success)',
      glyph: 'userfixed',
      verb: 'Artist page fixed',
    },
    'crew.going': {
      label: 'Crews',
      ink: 'var(--accent)',
      glyph: 'crew',
      verb: 'Crew plans',
    },
    'crew.joined': {
      label: 'Crews',
      ink: 'var(--accent)',
      glyph: 'crew',
      verb: 'New crew member',
    },
    'crew.left': {
      label: 'Crews',
      ink: 'var(--accent)',
      glyph: 'crew',
      verb: 'Crew member left',
    },
  };

/** An unknown category from a future writer renders a neutral bell row. */
export const CATEGORY_FALLBACK: CategoryPresentation = {
  label: 'Update',
  ink: 'var(--fg-muted)',
  glyph: 'bell',
  verb: 'Update',
};

/** Declaration order matches CATEGORY_MAP. */
export const CATEGORY_KEYS: NotificationCategory[] = Object.keys(
  CATEGORY_MAP,
).filter(isNotificationCategory);

export const categoryFor = (raw: string): CategoryPresentation =>
  isNotificationCategory(raw) ? CATEGORY_MAP[raw] : CATEGORY_FALLBACK;

/**
 * The three tabs of the panel (addendum 2, item 1). Each category belongs to
 * exactly one. A price drop is a Prices item, not a Shows one.
 */
export type NotificationTab = 'shows' | 'alerts' | 'prices';

export const NOTIFICATION_TABS: readonly NotificationTab[] = [
  'shows',
  'alerts',
  'prices',
];

/** The tab the panel opens on. */
export const DEFAULT_NOTIFICATION_TAB: NotificationTab = 'shows';

const TAB_BY_CATEGORY: Record<NotificationCategory, NotificationTab> = {
  'watch.cancelled': 'shows',
  'watch.postponed': 'shows',
  'watch.soldout': 'shows',
  'watch.backonsale': 'shows',
  'watch.pricedrop': 'prices',
  'contest.resolved': 'prices',
  'contest.needs_info': 'prices',
  'artist.new_show': 'alerts',
  'artist.report_fixed': 'alerts',
  'crew.going': 'alerts',
  'crew.joined': 'alerts',
  'crew.left': 'alerts',
};

/** An unknown category (the CATEGORY_FALLBACK path) lands under Alerts. */
export const tabFor = (raw: string): NotificationTab =>
  isNotificationCategory(raw) ? TAB_BY_CATEGORY[raw] : 'alerts';
