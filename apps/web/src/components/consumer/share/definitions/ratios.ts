// Aspect ratios the share renderer supports. Fixed pixel artboards — satori
// has no percentage-sized root, so every dimension the poster draws is derived
// from these numbers rather than from a viewport.

export interface ShareRatioSpec {
  width: number
  height: number
}

export const SHARE_RATIOS = ['story', 'square', 'link'] as const

// Derived from the tuple so one edit moves the type, the guard and the lookup
// together — same pattern as `lib/share/taglines.ts`.
export type ShareRatio = (typeof SHARE_RATIOS)[number]

export const DEFAULT_SHARE_RATIO: ShareRatio = 'story'

/**
 * ⚠️ `link` is 1200×628, not 1200×630. 628 is the locked value from the design
 * handoff's "Locked calls" — 630 was drift in an earlier ratio table. Do not
 * "correct" it.
 */
export const SC_RATIOS: Record<ShareRatio, ShareRatioSpec> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  link: { width: 1200, height: 628 },
}

/**
 * Every pixel measurement the poster uses, per ratio.
 *
 * A table rather than a chain of `isStory ? … : isLink ? … : …` ternaries: the
 * design handoff locks these numbers per ratio, and a table can be diffed
 * against §1 of the README line by line. The type sizes here are the README's
 * locked values, which override the (larger) ones in the `share-cards.jsx`
 * prototype — the prototype crowded the bottom block.
 */
export interface PosterMetrics {
  /** Edge inset of the whole bottom block. */
  padding: number
  /** Vertical rhythm between the bottom block's rows. */
  gap: number
  /** Artist display type. */
  title: number
  /** Venue · city. */
  subtitle: number
  /** Mono date stamp; the show time sits at `time` under it. */
  date: number
  time: number
  /** Tagline. Not drawn at `link` — there is no room. */
  tagline: number
  /** State pill label. */
  pill: number
  pillPaddingY: number
  pillPaddingX: number
  /** `ConcertCrawl` footer wordmark. */
  wordmark: number
  /** `@handle`, drawn only for a signed mint. */
  handle: number
  /** Mis-registration ghost offset, x/y. */
  ghostX: number
  ghostY: number
}

export const SC_METRICS: Record<ShareRatio, PosterMetrics> = {
  story: {
    padding: 72,
    gap: 28,
    title: 180,
    subtitle: 36,
    date: 56,
    time: 34,
    tagline: 30,
    pill: 22,
    pillPaddingY: 14,
    pillPaddingX: 22,
    wordmark: 78,
    handle: 36,
    ghostX: 8,
    ghostY: 6,
  },
  square: {
    padding: 58,
    gap: 22,
    title: 120,
    subtitle: 28,
    date: 46,
    time: 28,
    tagline: 26,
    pill: 20,
    pillPaddingY: 12,
    pillPaddingX: 20,
    wordmark: 60,
    handle: 30,
    ghostX: 5,
    ghostY: 4,
  },
  link: {
    padding: 52,
    gap: 14,
    title: 72,
    subtitle: 22,
    date: 34,
    time: 20,
    tagline: 20,
    pill: 16,
    pillPaddingY: 10,
    pillPaddingX: 18,
    wordmark: 42,
    handle: 22,
    ghostX: 5,
    ghostY: 4,
  },
}

/** Closed-set guard. `apps/web` has no Zod; three members is a full validator. */
export const isShareRatio = (candidate: string): candidate is ShareRatio =>
  SHARE_RATIOS.some((ratio) => ratio === candidate)

/**
 * The route rejects an unknown ratio with a 400 rather than falling back, so
 * this resolver is only for callers that genuinely want a default (the sheet's
 * initial selection). Guard first — never index on an unvalidated string.
 */
export const resolveShareRatio = (raw: string | undefined): ShareRatio =>
  raw !== undefined && isShareRatio(raw) ? raw : DEFAULT_SHARE_RATIO
