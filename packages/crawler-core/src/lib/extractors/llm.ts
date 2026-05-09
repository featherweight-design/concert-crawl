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
})

const ToolInputSchema = z.object({
  events: z.array(NormalizedEventSchema),
})

const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a concert event data extractor. Given HTML from a venue website, call the save_events tool with all upcoming concert events you find.

Rules:
- date must be ISO format YYYY-MM-DD
- confidence reflects how certain you are the extraction is accurate (0.0-1.0)
- Only include actual upcoming events, not past events
- If artist is unclear, use the event title as the artist
- Pass an empty events array if no concert events are found`

const SAVE_EVENTS_TOOL: Anthropic.Tool = {
  name: 'save_events',
  description: 'Save all extracted upcoming concert events from the venue page',
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
          },
          required: ['title', 'artist', 'date', 'confidence'],
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
        content: `Extract all concert events from this venue page HTML:\n\nURL: ${sourceUrl}\n\n${cleanedHtml}`,
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

  const events = parsed.data.events.map((e) => ({
    title: e.title,
    artist: e.artist,
    date: e.date,
    confidence: e.confidence,
    sourceUrl,
    ...(e.doorsTime != null &&
      e.doorsTime !== '' && { doorsTime: e.doorsTime }),
    ...(e.showTime != null && e.showTime !== '' && { showTime: e.showTime }),
    ...(e.ticketUrl != null && { ticketUrl: e.ticketUrl }),
    ...(e.description != null && { description: e.description }),
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
