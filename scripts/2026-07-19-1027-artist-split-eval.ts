/**
 * Real-LLM eval for the artist run-on split fix (#1027).
 *
 * The normal extractor unit tests mock the Anthropic SDK, so they verify
 * plumbing but NOT whether Haiku actually splits a run-on billing into
 * headliner + openers. This script runs the REAL extractor against a page
 * of known-bad prod titles and asserts the expected artist / supportingArtists
 * split for each — the only way to validate the prompt change before shipping.
 *
 * Run (needs a live key):
 *   set -a; source apps/crawler/.env.local; set +a
 *   pnpm tsx scripts/2026-07-19-1027-artist-split-eval.ts
 *
 * Exits non-zero if any case fails. Costs a few cents per run (one Haiku call).
 */

// Relative source import (not package barrel) so this runs against a clean
// checkout without a prior crawler-core build. tsx resolves .js → .ts source.
import { extractWithLlm } from '../packages/crawler-core/src/lib/extractors/llm.js'

interface EvalCase {
  rawTitle: string
  expectedArtist: string
  expectedSupporting: string[]
  // Expected tourName routing. Omit (or null) means "no tour named" — the
  // extractor must return a null/empty tourName. A string means the tour
  // subtitle must be routed here (not into supportingArtists).
  expectedTourName?: string | null
}

// Each case is a real (or realistic) run-on billing pulled from the prod
// spot-check. `date` is assigned per-card below so every card is "upcoming".
const CASES: EvalCase[] = [
  // Comma run-on: multiple distinct acts.
  {
    rawTitle: 'Dylan Earl, The Gray Jays, Johno Leeroy',
    expectedArtist: 'Dylan Earl',
    expectedSupporting: ['The Gray Jays', 'Johno Leeroy'],
  },
  {
    rawTitle: 'Widowspeak, Dead Gowns',
    expectedArtist: 'Widowspeak',
    expectedSupporting: ['Dead Gowns'],
  },
  {
    rawTitle: 'Bassurgence, Westwood, GOODTR!P, BRITEHOP',
    expectedArtist: 'Bassurgence',
    expectedSupporting: ['Westwood', 'GOODTR!P', 'BRITEHOP'],
  },
  // Title-embedded openers: "with ... and ...".
  {
    rawTitle: 'Hilary Duff with La Roux and Jade LeMac',
    expectedArtist: 'Hilary Duff',
    expectedSupporting: ['La Roux', 'Jade LeMac'],
  },
  // Title-embedded openers: "w/ a, b, c".
  {
    rawTitle: 'The Widdler w/ Thelem, Roommate, Aimerie',
    expectedArtist: 'The Widdler',
    expectedSupporting: ['Thelem', 'Roommate', 'Aimerie'],
  },
  // Title-embedded opener: "w/ x".
  {
    rawTitle: 'Kill Bill: The Rapper w/ Ashtin Larold',
    expectedArtist: 'Kill Bill: The Rapper',
    expectedSupporting: ['Ashtin Larold'],
  },
  // Single-name commas — must NOT split.
  {
    rawTitle: 'Goodnight, Texas',
    expectedArtist: 'Goodnight, Texas',
    expectedSupporting: [],
  },
  {
    rawTitle: 'hey, nothing',
    expectedArtist: 'hey, nothing',
    expectedSupporting: [],
  },
  {
    rawTitle: 'Crosby, Stills & Nash',
    expectedArtist: 'Crosby, Stills & Nash',
    expectedSupporting: [],
  },
  {
    rawTitle: 'Earth, Wind & Fire',
    expectedArtist: 'Earth, Wind & Fire',
    expectedSupporting: [],
  },
  // Tour-title commas — must NOT become openers; the subtitle routes to
  // tourName instead.
  {
    rawTitle: 'CHIODOS: ITS NOT YOU, ITS ME TOUR',
    expectedArtist: 'Chiodos',
    expectedSupporting: [],
    expectedTourName: "It's Not You, It's Me Tour",
  },
  {
    rawTitle: 'Skillet: Comatose 20 Years, Still Screaming Tour',
    expectedArtist: 'Skillet',
    expectedSupporting: [],
    expectedTourName: 'Comatose 20 Years, Still Screaming Tour',
  },
]

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

function arraysMatch(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false
  return actual.every(
    (val, idx) => normalize(val) === normalize(expected[idx] ?? ''),
  )
}

// Tour names vary in punctuation/casing across model runs (e.g. apostrophes
// in "It's Not You" may be dropped). Compare on a looser key: lowercase,
// strip apostrophes, reduce remaining punctuation to spaces, collapse.
function normalizeTour(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tourNameMatches(
  actual: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (expected == null || expected === '') {
    return actual == null || actual === ''
  }
  return actual != null && normalizeTour(actual) === normalizeTour(expected)
}

function buildHtml(cases: EvalCase[]): string {
  const cards = cases
    .map((testCase, idx) => {
      // Spread dates across future days relative to today so each card is a
      // distinct upcoming event no matter when the eval runs. A hardcoded
      // calendar month would silently fall into the past and make the eval
      // flaky once that month elapsed. Anchor on a UTC midnight baseline so
      // the card dates line up with the extractor prompt's "today" (also
      // UTC, via toISOString), avoiding local-vs-UTC drift that could push
      // the first card onto "today" and risk it being dropped as not-upcoming.
      const now = new Date()
      const eventDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + idx + 1,
        ),
      )
      const iso = eventDate.toISOString().slice(0, 10)
      const human = eventDate.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      return `
        <article class="event">
          <h2 class="event-title">${testCase.rawTitle}</h2>
          <time datetime="${iso}">${human}</time>
          <a href="https://example.com/tickets/${idx}">Tickets</a>
        </article>`
    })
    .join('\n')
  return `<!doctype html><html><body><main id="events">${cards}</main></body></html>`
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ANTHROPIC_API_KEY not set. Run: set -a; source apps/crawler/.env.local; set +a',
    )
    process.exit(2)
  }

  const html = buildHtml(CASES)
  const { events } = await extractWithLlm(html, 'https://example.com/events')

  const byRaw = new Map<string, (typeof events)[number]>()
  for (const evt of events) {
    byRaw.set(normalize(evt.rawTitle), evt)
    // Also index on title in case the model cleaned rawTitle.
    byRaw.set(normalize(evt.title), evt)
  }

  let failures = 0
  for (const testCase of CASES) {
    const found =
      byRaw.get(normalize(testCase.rawTitle)) ??
      events.find((evt) =>
        normalize(evt.artist).startsWith(normalize(testCase.expectedArtist)),
      )

    if (!found) {
      failures += 1
      console.log(`FAIL  ${testCase.rawTitle}\n      not extracted`)
      continue
    }

    const supporting = found.supportingArtists ?? []
    const artistOk =
      normalize(found.artist) === normalize(testCase.expectedArtist)
    const supportingOk = arraysMatch(supporting, testCase.expectedSupporting)
    const tourOk = tourNameMatches(found.tourName, testCase.expectedTourName)

    if (artistOk && supportingOk && tourOk) {
      console.log(`PASS  ${testCase.rawTitle}`)
    } else {
      failures += 1
      console.log(
        `FAIL  ${testCase.rawTitle}\n` +
          `      artist    exp="${testCase.expectedArtist}" got="${found.artist}"\n` +
          `      openers   exp=[${testCase.expectedSupporting.join(', ')}] got=[${supporting.join(', ')}]\n` +
          `      tourName  exp="${testCase.expectedTourName ?? ''}" got="${found.tourName ?? ''}"`,
      )
    }
  }

  console.log(`\n${CASES.length - failures}/${CASES.length} passed`)
  if (failures > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
