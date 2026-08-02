// Pure diff logic for scripts/sync-venues.ts, split out so it can be tested
// without a database.

// Only the fields the upsert actually writes are compared. `address` is
// excluded because its COALESCE means an existing non-null value always
// wins — reporting it as a pending change would be a lie the operator then
// has to talk themselves out of on every run.
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

export type ComparableVenue = { slug: string } & Partial<
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

    const differs = COMPARED_FIELDS.some(
      (field) =>
        normalize(seedValue(seedVenue, field)) !== normalize(current[field]),
    )

    if (differs) {
      toUpdate.push(seedVenue.slug)
    } else {
      unchanged.push(seedVenue.slug)
    }
  }

  return { toCreate, toUpdate, unchanged }
}
