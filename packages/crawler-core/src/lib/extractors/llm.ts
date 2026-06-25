import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { LLMResult } from '../../types.js'

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'date must be a valid calendar date')

const NormalizedEventSchema = z.object({
  title: z.string(),
  artist: z.string(),
  date: isoDateSchema,
  doorsTime: z.string().nullable().optional(),
  showTime: z.string().nullable().optional(),
  ticketUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  isConcert: z.boolean().optional(),
  reviewNeeded: z.boolean().optional(),
})

const ToolInputSchema = z.object({
  events: z.array(NormalizedEventSchema),
})

const MODEL = 'claude-haiku-4-5-20251001'

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
- dance nights backed by a live band (swing, jazz, salsa nights where musicians play)

isConcert=false: non-performance events at music venues. Includes:
- themed dance parties driven by recorded music, where the title's named entity is the THEME / inspiration (whose recordings get played) rather than the performer — e.g. "Liv, Laugh, Love: Olivia Rodrigo Dance Party" (recorded Olivia Rodrigo tracks; she is not performing). Contrast with "Honey Dijon" at a kick-off party (Honey Dijon IS performing live = concert).
- bingo (e.g. "BASS BINGO – Wooli Edition!" — Wooli is the theme, the event is bingo)
- trivia, comedy, film/movie screenings (e.g. "Film on the Rocks: Sinners"), karaoke, listening parties
- private events, transportation/logistics (e.g. "Bus To Show Pickup Spot"), markets, fitness ("Yoga on the Rocks"), charity walks/runs ("9/11 Stair Climb"), spoken-word/poetry readings, wellness lectures, drag shows (lip-sync, not live singing)

Disambiguation rule: when a title contains the name of a real touring artist/DJ AND a specific billing/event framing phrase ("Kick Off Party", "After Party", "Pre-Party", "Feat.", "Featuring", "Presents", "with"), default to TRUE (concert) — the artist is the headliner. The standalone phrase "Dance Party" does NOT trigger this rule — it's the signature of a recorded-music theme night (e.g. "Olivia Rodrigo Dance Party"). Only treat as FALSE when the artist's name is clearly being used as a theme (their recordings being played back by unnamed DJs), as with "Olivia Rodrigo Dance Party" or "BASS BINGO – Wooli Edition".`

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
- If artist is unclear, use the event title as the artist
- Pass an empty events array if no events are found
- When a date has no year, infer it using today's date (provided in the user message): if the month/day is today or in the future within the current year, use the current year; if the month/day has already passed this year, use next year

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
            artist: {
              type: 'string',
              description: 'Main performing artist or band name',
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
              description: 'Ticket purchase URL or null',
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

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50_000)
}

export async function extractWithLlm(
  html: string,
  sourceUrl: string,
): Promise<LLMResult> {
  const client = new Anthropic()
  const cleanedHtml = cleanHtml(html)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16384,
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

  const usage = response.usage
  const tokenUsage = {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  }

  const toolUseBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    console.log(JSON.stringify({ event: 'llm.no_tool_use', sourceUrl }))
    return { events: [], usage: tokenUsage }
  }

  const parsed = ToolInputSchema.safeParse(toolUseBlock.input)
  if (!parsed.success) {
    console.log(
      JSON.stringify({
        event: 'llm.invalid_tool_input',
        sourceUrl,
        error: parsed.error.message,
      }),
    )
    return { events: [], usage: tokenUsage }
  }

  const events = parsed.data.events.map((evt) => ({
    title: evt.title,
    artist: evt.artist,
    date: evt.date,
    confidence: evt.confidence,
    sourceUrl,
    ...(evt.doorsTime != null &&
      evt.doorsTime !== '' && { doorsTime: evt.doorsTime }),
    ...(evt.showTime != null &&
      evt.showTime !== '' && { showTime: evt.showTime }),
    ...(evt.ticketUrl != null && { ticketUrl: evt.ticketUrl }),
    ...(evt.description != null && { description: evt.description }),
    ...(evt.isConcert != null && { isConcert: evt.isConcert }),
    ...(evt.reviewNeeded != null && { reviewNeeded: evt.reviewNeeded }),
  }))

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
