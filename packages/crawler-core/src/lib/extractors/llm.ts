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
})

const ToolInputSchema = z.object({
  events: z.array(NormalizedEventSchema),
})

const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a concert event data extractor. Given HTML from a venue website, call the save_events tool with all upcoming events you find — including non-concert events. Downstream tooling uses isConcert to decide what reaches consumers.

Rules:
- date must be ISO format YYYY-MM-DD
- confidence reflects how certain you are the extraction is accurate (0.0-1.0)
- Only include actual upcoming events, not past events
- If artist is unclear, use the event title as the artist
- Pass an empty events array if no events are found
- When a date has no year, infer it using today's date (provided in the user message): if the month/day is today or in the future within the current year, use the current year; if the month/day has already passed this year, use next year

isConcert rules (for every event):
- true: named musician(s) performing live music. Includes bands, solo artists, DJ sets, orchestras, jazz performances, tribute bands when they are themselves performing
- false: non-performance events that happen at music venues — themed dance parties (e.g. "Liv, Laugh, Love: Olivia Rodrigo Dance Party"), bingo nights (e.g. "BASS BINGO – Wooli Edition!"), trivia, comedy, film/movie screenings (e.g. "Film on the Rocks: Sinners"), karaoke, listening parties, private events`

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
          },
          required: ['title', 'artist', 'date', 'confidence', 'isConcert'],
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
        content: `Today's date: ${new Date().toISOString().slice(0, 10)}\n\nExtract all concert events from this venue page HTML:\n\nURL: ${sourceUrl}\n\n${cleanedHtml}`,
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
