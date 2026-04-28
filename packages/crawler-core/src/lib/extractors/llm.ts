import Anthropic from '@anthropic-ai/sdk'
import type { LLMResult, NormalizedEvent } from '../../types.js'

const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a concert event data extractor. Given HTML from a venue website, extract all upcoming concert events and return them as JSON.

Return ONLY a JSON object with this exact structure:
{
  "events": [
    {
      "title": "Full event/show title",
      "artist": "Main performing artist or band name",
      "date": "YYYY-MM-DD",
      "doorsTime": "HH:MM:SS or null",
      "showTime": "HH:MM:SS or null",
      "ticketUrl": "https://... or null",
      "description": "Short description or null",
      "imageUrl": "https://... or null",
      "confidence": 0.0 to 1.0
    }
  ]
}

Rules:
- date must be ISO format YYYY-MM-DD
- confidence reflects how certain you are the extraction is accurate (0.0-1.0)
- Return an empty events array if no concert events are found
- Only include actual upcoming events, not past events
- If artist is unclear, use the event title as the artist`

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
    max_tokens: 4096,
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

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    console.log(JSON.stringify({ event: 'llm.no_text_response', sourceUrl }))
    return { events: [], usage: tokenUsage }
  }

  let parsed: { events?: NormalizedEvent[] }
  try {
    parsed = JSON.parse(textBlock.text) as { events?: NormalizedEvent[] }
  } catch {
    console.log(
      JSON.stringify({
        event: 'llm.parse_error',
        sourceUrl,
        raw: textBlock.text.substring(0, 200),
      }),
    )
    return { events: [], usage: tokenUsage }
  }

  const events = (parsed.events ?? []).map((e) => ({
    ...e,
    sourceUrl,
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
