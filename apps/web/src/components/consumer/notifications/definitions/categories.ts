// Category presentation for the notification panel (#737), ported verbatim
// from design_handoff_in_app_notifications/notifications-data.jsx
// (CATEGORY_MAP, R2).
//
// THE SYSTEM: ink encodes VALENCE, glyph encodes EVENT.
//
//   --danger    bad news you can't act on      watch.cancelled
//   --warning   changed on you / closing       watch.postponed · watch.soldout
//   --success   good news                      watch.backonsale · watch.pricedrop
//   --fg-muted  a neutral verdict              contest.resolved
//   --signal    a task — you owe a reply       contest.needs_info
//   --accent    discovery, not your shows      spotify.new_show · crew.*
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

import type { NotificationCategory } from '@/lib/notifications'
import { isNotificationCategory } from '@/lib/notifications'
import type { GlyphName } from '../glyphs'

export interface CategoryPresentation {
  /** Spelled-out eyebrow — the not-colour-alone half of 1.4.1. */
  label: string
  /** A CSS custom property reference; graphics only, never text. */
  ink: string
  glyph: GlyphName
  /** Leads the row's accessible name, e.g. "Show cancelled. …". */
  verb: string
}

/**
 * Exhaustive over the shipped union, so a ninth category added to
 * `NotificationCategory` is a compile error here rather than a blank tile in
 * production.
 */
export const CATEGORY_MAP: Record<NotificationCategory, CategoryPresentation> =
  {
    'watch.cancelled': {
      label: 'Cancelled',
      ink: 'var(--danger)',
      glyph: 'cancelled',
      verb: 'Show cancelled',
    },
    'watch.postponed': {
      label: 'Moved',
      ink: 'var(--warning)',
      glyph: 'postponed',
      verb: 'Show moved',
    },
    'watch.soldout': {
      label: 'Sold out',
      ink: 'var(--warning)',
      glyph: 'soldout',
      verb: 'Show sold out',
    },
    'watch.backonsale': {
      label: 'Back on',
      ink: 'var(--success)',
      glyph: 'backonsale',
      verb: 'Tickets back on sale',
    },
    'watch.pricedrop': {
      label: 'Price drop',
      ink: 'var(--success)',
      glyph: 'pricedrop',
      verb: 'Price drop',
    },
    'contest.resolved': {
      label: 'Price check',
      ink: 'var(--fg-muted)',
      glyph: 'resolved',
      verb: 'Price check result',
    },
    'contest.needs_info': {
      label: 'Needs you',
      ink: 'var(--signal)',
      glyph: 'needsinfo',
      verb: 'Price check needs you',
    },
    'spotify.new_show': {
      label: 'Spotify',
      ink: 'var(--accent)',
      glyph: 'spotify',
      verb: 'New Denver date',
    },
    'crew.going': {
      label: 'Crew',
      ink: 'var(--accent)',
      glyph: 'crew',
      verb: 'Crew plans',
    },
    'crew.joined': {
      label: 'Crew',
      ink: 'var(--accent)',
      glyph: 'crew',
      verb: 'New crew member',
    },
    'crew.left': {
      label: 'Crew',
      ink: 'var(--accent)',
      glyph: 'crew',
      verb: 'Crew member left',
    },
  }

/** An unknown category from a future writer renders a neutral bell row. */
export const CATEGORY_FALLBACK: CategoryPresentation = {
  label: 'Update',
  ink: 'var(--fg-muted)',
  glyph: 'bell',
  verb: 'Update',
}

/** Declaration order matches CATEGORY_MAP. */
export const CATEGORY_KEYS: NotificationCategory[] = Object.keys(
  CATEGORY_MAP,
).filter(isNotificationCategory)

export const categoryFor = (raw: string): CategoryPresentation =>
  isNotificationCategory(raw) ? CATEGORY_MAP[raw] : CATEGORY_FALLBACK
