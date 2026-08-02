// Pure diff logic for scripts/sync-venues.ts, split out so it can be tested
// without a database.

// The fields the upsert writes with a plain `excluded.<col>`, so a straight
// value comparison models them exactly. `address` is handled separately —
// see addressDiffers — because its COALESCE gives it different semantics.
export const COMPARED_FIELDS = [
  'name',
  'websiteUrl',
  'capacity',
  'venueType',
  'neighborhood',
  'about',
  'lat',
  'lng',
  'ticketVendor',
  'crawlMode',
  'crawlWaitUntil',
  'crawlWaitForSelector',
  'crawlDelayMs',
  'featured',
  'active',
  'verified',
] as const

type ComparedField = (typeof COMPARED_FIELDS)[number]

export type ComparableVenue = { slug: string; address?: unknown } & Partial<
  Record<ComparedField, unknown>
>

export interface VenueDiff {
  toCreate: string[]
  toUpdate: string[]
  unchanged: string[]
}

// Values arrive from two sources with different shapes for the same column:
// a seed literal may be `3000` where the DB row is the numeric string
// `'3000'`. Normalising both sides to a string keeps the diff from
// reporting churn that the upsert would not actually write.
const normalize = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value)

// A field the seed omits is not "no value" — the INSERT writes the column
// default, and `excluded.<col>` therefore carries that default into the
// UPDATE branch too. Resolving omissions against the schema defaults is
// what makes the diff match what a --commit would really do. Without it
// every venue that leaves `featured` unset reads as drift forever, and an
// omission that would genuinely reset a hand-edited value reads as clean.
export type ColumnDefaults = Partial<Record<ComparedField, unknown>>

// `address` is written as COALESCE(venues.address, excluded.address), so an
// existing non-null value always wins and seed drift against it is not a
// pending write — reporting it would be a lie the operator has to talk
// themselves out of on every run. The one case that IS a write is a null
// current address filled in from the seed, which a plain value comparison
// would miss entirely.
const addressDiffers = (
  seedVenue: ComparableVenue,
  current: ComparableVenue,
): boolean =>
  normalize(current.address) === '' && normalize(seedVenue.address) !== ''

export const diffVenues = (
  seedVenues: readonly ComparableVenue[],
  existingVenues: readonly ComparableVenue[],
  columnDefaults: ColumnDefaults = {},
): VenueDiff => {
  const seedValue = (venue: ComparableVenue, field: ComparedField): unknown =>
    venue[field] === undefined ? columnDefaults[field] : venue[field]

  const bySlug = new Map(existingVenues.map((venue) => [venue.slug, venue]))

  const toCreate: string[] = []
  const toUpdate: string[] = []
  const unchanged: string[] = []

  for (const seedVenue of seedVenues) {
    const current = bySlug.get(seedVenue.slug)
    if (!current) {
      toCreate.push(seedVenue.slug)
      continue
    }

    const differs =
      COMPARED_FIELDS.some(
        (field) =>
          normalize(seedValue(seedVenue, field)) !== normalize(current[field]),
      ) || addressDiffers(seedVenue, current)

    if (differs) {
      toUpdate.push(seedVenue.slug)
    } else {
      unchanged.push(seedVenue.slug)
    }
  }

  return { toCreate, toUpdate, unchanged }
}
