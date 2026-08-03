import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { reportFailure } from '@concert-crawl/logger'
import type { LLMResult } from '../../types.js'
import { cleanHtml, resolveExtractedUrl } from './clean-html.js'
import { normalizeSupportingArtists } from '../normalize-supporting-artists.js'
import { stripDescriptionHtml } from '../strip-description-html.js'
import { stripDuplicatedTrailingWord } from '../strip-duplicated-trailing-word.js'

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'date must be a valid calendar date')

export const NormalizedEventSchema = z.object({
  title: z.string(),
  // EXACT source-headline copy used by the cross-venue presale filter to
  // detect "Artist AT OTHER VENUE" markers. See issue #826 and the
  // matching property on `NormalizedEvent` in ../../types.ts.
  rawTitle: z.string(),
  // Nullable because non-concert listings (bingo, trivia, movie nights,
  // themed parties) genuinely have no performer to name, and the model
  // correctly returns null rather than inventing one. Null is resolved to
  // the cleaned title in the mapping below, so `NormalizedEvent.artist`
  // stays a plain string downstream.
  artist: z.string().nullable(),
  // Every act headlining the bill, in billing order, including the primary
  // one in `artist` (#1203). Optional: a model response that omits it falls
  // back to [artist] downstream, so the headliners[0] === artist invariant
  // holds either way.
  headliners: z.array(z.string()).optional(),
  supportingArtists: z.array(z.string()).optional(),
  tourName: z.string().nullable().optional(),
  date: isoDateSchema,
  doorsTime: z.string().nullable().optional(),
  showTime: z.string().nullable().optional(),
  ticketUrl: z.string().nullable().optional(),
  eventUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  isConcert: z.boolean().optional(),
  reviewNeeded: z.boolean().optional(),
})

// Deliberately loose: the array shape is validated here, but each element is
// checked individually below so one malformed row can't void an otherwise
// good batch. See the per-row loop in `extractWithLlm`.
//
// The preprocess step exists because Haiku intermittently ignores the tool
// schema's `type: 'array'` and emits `events` as a JSON-encoded *string* —
// `{"events": "[{\"title\": ...}]"}`. It is non-deterministic and independent
// of page size: on 2026-07-24 it took Hi-Dive (24 events, 4.4K output tokens),
// Red Rocks and Cervantes to zero on the same night while Larimer Lounge came
// back fine. Unwrap it rather than rejecting it — a rejection discards every
// event on the page.
const ToolInputSchema = z.object({
  events: z.preprocess((value) => {
    if (typeof value !== 'string') return value
    try {
      return JSON.parse(value)
    } catch (err) {
      // Report the parse error separately: the Zod failure downstream only
      // says "expected array, received string", which can't distinguish a
      // payload truncated mid-value from one that was never JSON. Length is
      // logged instead of the payload itself to keep the event small.
      reportFailure({
        event: 'llm.stringified_events_unparseable',
        severity: 'warn',
        error: err instanceof Error ? err.message : String(err),
        payloadChars: value.length,
      })
      // Leave it as-is so the array check below reports the real problem
      // instead of masking a genuinely malformed payload.
      return value
    }
  }, z.array(z.unknown())),
})

type NormalizedEventRow = z.infer<typeof NormalizedEventSchema>

const MODEL = 'claude-haiku-4-5-20251001'

// Output token budget for the save_events tool call. Haiku 4.5 supports
// up to 64K output. The prior cap of 16384 was hit silently by Red Rocks
// (148 events × ~6 required fields per event + descriptions) on 2026-06-25:
// Anthropic returned `stop_reason: 'max_tokens'` mid-tool-call, the SDK
// surfaced a truncated tool input where `events` was undefined, Zod
// rejected, and the crawl reported `success` + 0 events with no error.
// 64K is Haiku 4.5's ceiling. 32K was not enough headroom: Cervantes' 135
// events already cost 26–28K in normal array form, and the stringified-events
// quirk handled by `ToolInputSchema` escapes every quote in the payload, which
// roughly triples its length — that pushed the 2026-07-25 run to exactly
// 32,000 output tokens, truncating mid-string. The cap is a ceiling, not a
// reservation: billing is per token produced, so raising it costs nothing on
// runs that don't need it.
const MAX_OUTPUT_TOKENS = 64_000

// Shared canonical rule set for isConcert classification. Used by both
// the live crawler SYSTEM_PROMPT below and the one-shot non-concert
// backfill script's classifier prompt so the two stay in lockstep.
export const IS_CONCERT_RULES = `isConcert=true: named musician(s) performing live music. Includes:
- bands, solo artists, DJ sets, orchestras, jazz performances
- tribute bands performing live (e.g. "Strangelove — The Depeche Mode Experience"); titles with "Tribute", "Experience", or "Reimagined" where a named act performs are concerts
- music competitions or showcases where named musicians perform live (e.g. "NPR Presents Tiny Desk Contest On The Road")
- symphonies/orchestras performing film, TV, or video-game scores live (e.g. "Stardew Valley: Symphony of Seasons", "World of Warcraft: 20 Years of Music")
- "X Presents: Y" billings where X is the headlining artist (e.g. "Tape B Presents: Hallow Rocks")
- "Feat." / "Featuring" / "with" billings naming a real performer — the named act IS performing live (e.g. "Open House Feat. DJ Sliink")
- pride parties, kick-off parties, after-parties, pre-parties when the headline name is a real touring DJ/musician — they are performing the event, not just being themed around (e.g. "Denver Pride Kick Off Party - Honey Dijon", "Ball Arena After Party - Carl Cox")
- multi-band tours and festival brands where bands play live (e.g. "Taste of Chaos", "Warped Tour")
- live-band dance nights ONLY when the billing names a specific touring artist or band as the headliner (e.g. "Big Bad Voodoo Daddy Swing Night" → concert). Recurring local-residency dance nights — even with a house band — are NOT concerts (see below).

isConcert=false: non-performance events at music venues. Includes:
- themed dance parties driven by recorded music, where the title's named entity is the THEME / inspiration (whose recordings get played) rather than the performer — e.g. "Liv, Laugh, Love: Olivia Rodrigo Dance Party" (recorded Olivia Rodrigo tracks; she is not performing). Contrast with "Honey Dijon" at a kick-off party (Honey Dijon IS performing live = concert).
- recurring local-residency dance nights — e.g. "Swing Nights Lindy Jam", "Tuesday Salsa Social", "Bachata Night". Even when a house band plays, the concert calendar is built around touring artists, not weekly venue programming. If the title is a recurring brand without a specific touring artist named, it's NOT a concert.
- bingo (e.g. "BASS BINGO – Wooli Edition!" — Wooli is the theme, the event is bingo)
- trivia, comedy, film/movie screenings (e.g. "Film on the Rocks: Sinners", "Film on the Rocks: Jurassic Park"), karaoke, listening parties
- private events, transportation/logistics (e.g. "Bus To Show Pickup Spot"), markets, fitness ("Yoga on the Rocks"), charity walks/runs ("9/11 Stair Climb", "Run the Rocks"), spoken-word/poetry readings, wellness lectures, drag shows (lip-sync, not live singing)
- DJ-driven recurring-brand events where "LIVE" in the title means "in-person experience" rather than live music — e.g. "R&B ONLY LIVE - 18+", "House Party - Sweaty 2010s Rager", "Bearracuda - 18+", "Bop To The Top - 18+", "Broadway Rave - 18+", "Hard Candy - 18+", "Gimme Gimme Disco - 18+".

Disambiguation rule: when a title contains the name of a real touring artist/DJ AND a specific billing/event framing phrase ("Kick Off Party", "After Party", "Pre-Party", "Feat.", "Featuring", "Presents", "with"), default to TRUE (concert) — the artist is the headliner. The standalone phrase "Dance Party" does NOT trigger this rule — it's the signature of a recorded-music theme night (e.g. "Olivia Rodrigo Dance Party"). Only treat as FALSE when the artist's name is clearly being used as a theme (their recordings being played back by unnamed DJs), as with "Olivia Rodrigo Dance Party" or "BASS BINGO – Wooli Edition".

"LIVE" rule: "LIVE" inside a recurring DJ-driven brand name does NOT signal live music — it means "in-person experience". "R&B ONLY LIVE - 18+" is NOT a concert. "Wynonna Judd Live" IS a concert. The difference is whether a specific touring artist's name is paired with "Live". When in doubt about a "_____ LIVE" title with no named touring artist, default to FALSE.`

// Optional add-on appended to IS_CONCERT_RULES in contexts that ACCEPT and
// EMIT reviewNeeded (the live crawler's save_events tool + PR 2's
// isconcert-review-needed backfill). Older callers like
// scripts/2026-06-19-non-concert-backfill.ts that only emit isConcert do
// NOT inline this — their tool schemas reject reviewNeeded, so adding the
// guidance there bloats tokens with rules the model can't act on.
export const REVIEW_NEEDED_RULES = `For every classification, ALSO set reviewNeeded:
- true: you weighed both interpretations and the evidence is genuinely ambiguous. Examples:
  - Title contains a brand or made-up name (e.g. "PRESIDENT", "Levity Presents") with no obvious touring-artist signal but URL/venue framing implies a live act
  - Title uses "Presents" or "Featuring" but the named entity could be a DJ brand OR a live performer and the venue alone doesn't disambiguate
  - Title contains "LIVE" but the brand context is DJ/recorded-music culture
- false: the classification is unambiguous in either direction (clear band-tour announcement OR clear bingo/trivia/movie/lip-sync framing)

reviewNeeded is independent of isConcert — emit it whenever you had to choose between two plausible interpretations, regardless of which direction you ended up picking.`

const SYSTEM_PROMPT = `You are an event data extractor for a music-venue concert calendar. Given HTML from a venue website, call the save_events tool with EVERY upcoming event you find, including non-concert events (themed parties, bingo, comedy, movies, etc.). Do not omit non-concert events — downstream tooling uses the isConcert field on each event to decide what reaches consumers.

Rules:
- date must be ISO format YYYY-MM-DD
- confidence reflects how certain you are the extraction is accurate (0.0-1.0)
- Only include actual upcoming events, not past events
- If artist is unclear, derive it from the event title — but still apply the headliner-only and run-on-splitting rules below (never copy a multi-act title verbatim into artist)
- If the listing names no performer at all (bingo, trivia, movie night, themed party), set artist to null. Do not invent a performer and do not copy the title into artist — null is expected here and handled downstream
- Pass an empty events array if no events are found
- When a date has no year, infer it using today's date (provided in the user message): if the month/day is today or in the future within the current year, use the current year; if the month/day has already passed this year, use next year
- rawTitle must be the EXACT verbatim copy of the event card's headline string from the page, byte-for-byte. Do NOT combine with subheads (e.g. "AEG Presents"), do NOT strip venue suffixes (e.g. "AT MISSION BALLROOM"), do NOT normalize or clean. The "title" field may be cleaned/combined, but rawTitle must be the unmodified source string. Downstream cross-venue routing depends on this
- artist must be the HEADLINER ONLY — a single act. NEVER store a run-on list of several acts (e.g. "Dylan Earl, The Gray Jays, Johno Leeroy") in artist.
- headliners: the full ordered list of acts that HEADLINE the bill, including the one you put in artist. headliners[0] MUST be exactly the same string as artist.
  - Most bills have exactly ONE headliner. In that (normal) case headliners is a single-element array: artist "Dylan Earl" → headliners ["Dylan Earl"].
  - Emit more than one entry ONLY when the billing genuinely presents multiple acts as co-equal headliners: a co-headline tour ("X + Y Co-Headline Tour"), an "A & B" top-line billing where both names are the marquee act, or a multi-room night where each room has its own top act.
  - Support acts NEVER appear in headliners — they belong in supportingArtists only.
  - A single act whose OWN name contains "&", "and", or "+" is ONE headliner, never two. These stay whole as a single-element headliners array: "Iron & Wine", "Coheed and Cambria", "Sammy Rae & The Friends", "for KING + COUNTRY", "Of Monsters and Men", "Big Head Todd & the Monsters". Judge by whether each side is a real, separately-touring act — never by the punctuation alone. When unsure, emit ONE headliner.
- supportingArtists: list the opening/supporting acts in the order printed, and do NOT include the headliner (already in artist). If the page shows no distinct openers, use an empty array.
- When a billing joins several acts with commas, "with", "w/", "and", "featuring", "feat.", "ft.", "&", "+", or "/", the FIRST act is the headliner (artist) and every act after it goes into supportingArtists. This applies whether the run-on appears in the artist field or embedded in the title:
  - "Dylan Earl, The Gray Jays, Johno Leeroy" → artist "Dylan Earl", supportingArtists ["The Gray Jays", "Johno Leeroy"]
  - "Hilary Duff with La Roux and Jade LeMac" → artist "Hilary Duff", supportingArtists ["La Roux", "Jade LeMac"]
  - "The Widdler w/ Thelem, Roommate, Aimerie" → artist "The Widdler", supportingArtists ["Thelem", "Roommate", "Aimerie"]
- BUT never fragment a single act's OWN name. Some band names legitimately contain a comma or ampersand — keep them whole with an empty supportingArtists:
  - "Goodnight, Texas" → artist "Goodnight, Texas", supportingArtists []
  - "hey, nothing" → artist "hey, nothing", supportingArtists []
  - "Crosby, Stills & Nash" → artist "Crosby, Stills & Nash", supportingArtists []
  - "Earth, Wind & Fire" → artist "Earth, Wind & Fire", supportingArtists []
- A comma inside a tour or subtitle is NOT an opener. Route that text to tourName, not supportingArtists:
  - "CHIODOS: ITS NOT YOU, ITS ME TOUR" → artist "Chiodos", tourName "It's Not You, It's Me Tour", supportingArtists []
  - "Skillet: Comatose 20 Years, Still Screaming Tour" → artist "Skillet", tourName "Comatose 20 Years, Still Screaming Tour", supportingArtists []
- When you cannot tell whether a comma separates two acts or sits inside one act's name, prefer keeping the name whole rather than fragmenting a real act.
- The page text has been flattened from HTML. Navigable http(s) links appear as a "[link: URL]" marker immediately BEFORE the text that was inside that link, so an event card's own URL is the marker directly preceding its title/image text. Use those markers to fill eventUrl and ticketUrl. Links that go nowhere a fan can visit (javascript:, mailto:, page anchors) are deliberately omitted — a missing marker is expected, not an error.
- eventUrl: the marker belonging to the event card itself — the page a fan reaches by clicking the show's title or image. Prefer the most specific per-event link over any calendar, category, or "see all events" link.
- ticketUrl: only set this when a marker points at a purchase/checkout page for THAT show (a ticketing host, or a link labelled "Buy"/"Tickets"/"Get Tickets"). If the only link is the venue's own event page, leave ticketUrl null and set eventUrl instead.
- NEVER invent, complete, or guess a URL. Copy it verbatim from a "[link: …]" marker on the page. If no marker applies to an event, use null. A fabricated URL sends fans to a dead page and is worse than no URL.
- tourName: only set this when the source names a tour/run distinctly (e.g. "The Eras Tour"). Do not put promoter/presenter text ("AEG Presents"), venue names, or opener names here. Use null when there is no tour name.

Set isConcert on every event using these rules:

${IS_CONCERT_RULES}

${REVIEW_NEEDED_RULES}`

const SAVE_EVENTS_TOOL: Anthropic.Tool = {
  name: 'save_events',
  description:
    'Save all extracted upcoming events from the venue page. Includes non-concert events; the isConcert field on each event distinguishes them.',
  input_schema: {
    type: 'object' as const,
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Full event/show title' },
            rawTitle: {
              type: 'string',
              description:
                "EXACT verbatim copy of the event card's headline/title string from the page, byte-for-byte. Do not clean, combine with subheads, strip venue suffixes (e.g. 'AT MISSION BALLROOM'), or normalize. Downstream cross-venue routing depends on this being the unmodified source string.",
            },
            artist: {
              type: ['string', 'null'],
              description:
                "Headliner only — a single act. Never a run-on list of multiple acts. If the billing joins several acts (commas, 'with', 'w/', 'and', 'feat.', '&', '+', '/'), put the first act here and the rest in supportingArtists. Do NOT fragment a single act's own name that contains a comma or ampersand (e.g. 'Goodnight, Texas', 'Earth, Wind & Fire'). Use null when the listing names no performer at all (bingo, trivia, movie nights, themed parties) — do not invent one and do not copy the title here; the extractor derives a fallback.",
            },
            headliners: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Every act HEADLINING this bill, in billing order, INCLUDING the one in the artist field — headliners[0] must equal artist exactly. Almost always a single-element array; emit more than one only when the billing genuinely presents multiple acts as co-equal headliners (a co-headline tour, an "A & B" marquee billing, or a multi-room night with a top act per room). Support acts never appear here. A single act whose own name contains "&", "and" or "+" is ONE headliner (e.g. "Iron & Wine", "Coheed and Cambria", "for KING + COUNTRY") — judge by whether each side is a real separately-touring act, never by the punctuation. When unsure, emit one.',
            },
            supportingArtists: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Opening / supporting acts, in billing order, EXCLUDING the headliner in the artist field. Order-preserved as printed on the source. Omit or use an empty array if there are no named openers.',
            },
            tourName: {
              type: ['string', 'null'],
              description:
                'The tour or run name when the source clearly labels one (e.g. "Rat Saw God Tour"). This is NOT the openers and NOT "AEG Presents"-style promoter text. Use null when no distinct tour name is present.',
            },
            date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
            doorsTime: {
              type: ['string', 'null'],
              description: 'HH:MM:SS or null',
            },
            showTime: {
              type: ['string', 'null'],
              description: 'HH:MM:SS or null',
            },
            ticketUrl: {
              type: ['string', 'null'],
              description:
                'Direct ticket purchase URL (the checkout/buy link) for THIS show, copied verbatim from a "[link: …]" marker on the page. Null when the page only links to the show\'s own detail page — put that in eventUrl instead. Never invent a URL.',
            },
            eventUrl: {
              type: ['string', 'null'],
              description:
                'The per-event detail page URL on the source site — the "[link: …]" marker immediately preceding this event card\'s title/image text. Copy it verbatim; never invent, complete or guess one. Prefer the most specific per-event link over a calendar or category link. Null if the listing has no dedicated detail page.',
            },
            description: {
              type: ['string', 'null'],
              description: 'Short description or null',
            },
            confidence: {
              type: 'number',
              description: 'Extraction confidence 0.0 to 1.0',
            },
            isConcert: {
              type: 'boolean',
              description:
                'true if a concert (named musicians performing live music). false for non-concert events like themed parties, bingo, trivia, movies, comedy, listening parties, karaoke.',
            },
            reviewNeeded: {
              type: 'boolean',
              description:
                'true when you had reasonable doubt about the isConcert classification (genuinely ambiguous title/framing). false when the classification is unambiguous in either direction.',
            },
          },
          required: [
            'title',
            'rawTitle',
            'artist',
            'date',
            'confidence',
            'isConcert',
            'reviewNeeded',
          ],
        },
      },
    },
    required: ['events'],
  },
}

export async function extractWithLlm(
  html: string,
  sourceUrl: string,
): Promise<LLMResult> {
  const client = new Anthropic()
  const { text: cleanedHtml, linkUrls } = cleanHtml(html, sourceUrl)

  // Use the streaming API. The Anthropic SDK rejects non-streaming
  // requests when `max_tokens` is large enough that the generation
  // could exceed 10 minutes — the prior `messages.create()` call started
  // hitting that ceiling once we bumped MAX_OUTPUT_TOKENS to 32_000 in
  // #806 (error: "Streaming is required for operations that may take
  // longer than 10 minutes"). The crawler doesn't need token-by-token
  // streaming behavior, so we drive the stream to completion with
  // `finalMessage()`, which returns the same assembled `Message` shape
  // (`content`, `stop_reason`, `usage`) that `messages.create()` did —
  // no downstream logic has to change.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    tools: [SAVE_EVENTS_TOOL],
    tool_choice: { type: 'tool', name: 'save_events' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Today's date: ${new Date().toISOString().slice(0, 10)}\n\nExtract every upcoming event from this venue page HTML — concerts AND non-concerts (themed parties, bingo, comedy, movies, etc.). Set isConcert on each one.\n\nURL: ${sourceUrl}\n\n${cleanedHtml}`,
      },
    ],
  })
  const response = await stream.finalMessage()

  const usage = response.usage
  const tokenUsage = {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  }

  // Output truncation surfaces as `stop_reason: 'max_tokens'`. The SDK
  // still returns a tool_use block, but its `input` JSON is incomplete,
  // so the Zod check below fails with a confusing schema error rather
  // than the actual cause. Log the truncation distinctly so the next
  // time the catalog outgrows MAX_OUTPUT_TOKENS the signal is obvious
  // (e.g. dashboard counts of 'llm.output_truncated') instead of silent
  // zero-event runs.
  if (response.stop_reason === 'max_tokens') {
    reportFailure({
      event: 'llm.output_truncated',
      severity: 'error',
      sourceUrl,
      // Deliberately not named *Tokens: Sentry's default data scrubbing
      // matches the `token` substring in an extra's key and replaces the
      // value with null, which left this report with no numbers at all.
      outputBudget: MAX_OUTPUT_TOKENS,
      outputUsed: tokenUsage.outputTokens,
    })
  }

  const toolUseBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    reportFailure({
      event: 'llm.no_tool_use',
      severity: 'warn',
      sourceUrl,
    })
    return { events: [], usage: tokenUsage }
  }

  const parsed = ToolInputSchema.safeParse(toolUseBlock.input)
  if (!parsed.success) {
    reportFailure({
      event: 'llm.invalid_tool_input',
      severity: 'error',
      sourceUrl,
      error: parsed.error.message,
    })
    return { events: [], usage: tokenUsage }
  }

  // Validate row-by-row rather than as one array. Batch-level parsing meant a
  // single unparseable event discarded every event on the page — Red Rocks and
  // Cervantes both went to zero for days because ~10% of their listings came
  // back with a null artist (#1162).
  const validRows: NormalizedEventRow[] = []
  const rowErrors: string[] = []
  parsed.data.events.forEach((row, index) => {
    const parsedRow = NormalizedEventSchema.safeParse(row)
    if (parsedRow.success) {
      validRows.push(parsedRow.data)
    } else {
      rowErrors.push(`[${index}] ${parsedRow.error.message}`)
    }
  })

  // Requires `validRows.length > 0`: a total wipeout is reported once below at
  // error severity, and emitting both would double-report the same failure.
  if (rowErrors.length > 0 && validRows.length > 0) {
    reportFailure({
      event: 'llm.invalid_event_dropped',
      // Warn, not error: the run still produced usable data.
      severity: 'warn',
      sourceUrl,
      droppedCount: rowErrors.length,
      totalCount: parsed.data.events.length,
      // Cap the payload — a wholesale schema drift would otherwise attach one
      // error per event and blow past Sentry's event size limit.
      errors: rowErrors.slice(0, 5).join('\n'),
    })
  }

  // Every row failing means the response shape drifted, not that one listing
  // was malformed. Keep the original event name so existing Sentry alerting
  // and dashboard queries still match.
  if (validRows.length === 0 && parsed.data.events.length > 0) {
    reportFailure({
      event: 'llm.invalid_tool_input',
      severity: 'error',
      sourceUrl,
      error: rowErrors.slice(0, 5).join('\n'),
    })
    return { events: [], usage: tokenUsage }
  }

  const events = validRows.map((evt) => {
    // Defense in depth against HTML leaking into the description field
    // (#827). The system prompt already asks for plain text, but Gothic
    // / RHP CMS pages sometimes prompt the model with `<p>`-wrapped
    // copy and Haiku passes it through verbatim. Stripping at the
    // extractor boundary keeps the DB free of markup regardless of what
    // the model decides to do.
    const description =
      evt.description != null ? stripDescriptionHtml(evt.description) : null
    // Defense in depth against the LLM duplicating a trailing word in
    // the cleaned title (#851 — BPM BINGO "...Edition Edition" prod
    // shape). Applied to `title` ONLY. `rawTitle` is intentionally NOT
    // cleaned: the system prompt and the cross-venue presale filter
    // (#826) require it to be byte-for-byte verbatim from the source —
    // which is exactly why it's passed as the cross-check (#863): a
    // repeat that also appears verbatim on the page (e.g. the band
    // "Bow Wow Wow") is real and must not be stripped.
    const title = stripDuplicatedTrailingWord(evt.title, evt.rawTitle)
    // Normalize opener names through the shared helper: trim each, drop
    // blank/whitespace-only entries so they never render as empty opener
    // chips, and drop any opener that repeats the headliner (case-insensitive).
    // The prompt instructs the model to exclude the headliner, but a
    // disobedient response would otherwise render it twice — once bold, once
    // in the "with …" openers line (#643).
    // Non-concert listings have no performer, so the model returns null. Fall
    // back to the cleaned title: it's what the prompt already tells the model
    // to do when the artist is merely unclear, and it keeps `artist` a
    // non-empty string for every downstream consumer (search, dedupe, the
    // Spotify matcher) rather than pushing null-handling into all of them.
    const artist = evt.artist?.trim() || title
    const supportingArtists = normalizeSupportingArtists(
      artist,
      evt.supportingArtists ?? [],
    )
    // headliners[0] must equal `artist` (#1203). Trim, drop blanks, and drop
    // case-insensitive repeats, then force the resolved artist into first
    // position — `artist` may itself be a fallback to the cleaned title when
    // the model returned null, in which case the model's own list can't be
    // trusted to lead with it. An omitted or emptied list falls back to
    // [artist]: a single headliner is never inferred by splitting a string.
    const seenHeadliners = new Set<string>([artist.toLowerCase()])
    const headliners = [artist]
    for (const rawName of evt.headliners ?? []) {
      const name = rawName.trim()
      if (name === '' || seenHeadliners.has(name.toLowerCase())) continue
      seenHeadliners.add(name.toLowerCase())
      headliners.push(name)
    }
    // Both URLs are checked against the page's own anchor set. The model
    // is told to copy them verbatim out of the "[link: …]" markers, but a
    // guessed slug would otherwise reach the CTA and 404 on the fan.
    const ticketUrl = resolveExtractedUrl(evt.ticketUrl, linkUrls)
    const eventUrl = resolveExtractedUrl(evt.eventUrl, linkUrls)
    return {
      title,
      rawTitle: evt.rawTitle,
      artist,
      headliners,
      date: evt.date,
      confidence: evt.confidence,
      sourceUrl,
      ...(evt.doorsTime != null &&
        evt.doorsTime !== '' && { doorsTime: evt.doorsTime }),
      ...(evt.showTime != null &&
        evt.showTime !== '' && { showTime: evt.showTime }),
      ...(ticketUrl != null && { ticketUrl }),
      ...(eventUrl != null && { eventUrl }),
      ...(description != null && description !== '' && { description }),
      ...(supportingArtists.length > 0 && { supportingArtists }),
      ...(evt.tourName != null &&
        evt.tourName.trim() !== '' && { tourName: evt.tourName.trim() }),
      ...(evt.isConcert != null && { isConcert: evt.isConcert }),
      ...(evt.reviewNeeded != null && { reviewNeeded: evt.reviewNeeded }),
    }
  })

  console.log(
    JSON.stringify({
      event: 'llm.extracted',
      sourceUrl,
      count: events.length,
      tokenUsage,
    }),
  )

  return { events, usage: tokenUsage }
}
