// Recovers the leading run of complete elements from a JSON array whose tail is
// malformed. Haiku intermittently emits the extractor's `events` array as a
// JSON-encoded string, and that string is occasionally corrupt part-way through
// — an unescaped quote mid-description, or a value cut off at the token ceiling.
// `JSON.parse` is all-or-nothing, so a single bad byte at element 90 discards
// the 89 good ones ahead of it and takes the venue to zero events for the night.
//
// Scanning for element boundaries rather than repairing the text is deliberate:
// every element returned here parsed cleanly on its own terms, so nothing
// downstream sees a half-built row.
export const salvageJsonArrayPrefix = (raw: string): unknown[] | null => {
  const start = raw.indexOf('[')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  // Byte offsets just past each element that closed at the top level.
  const elementEnds: number[] = []
  let arrayEnd = -1

  for (let i = start; i < raw.length; i++) {
    const char = raw[i]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === '[' || char === '{') depth++
    else if (char === ']' || char === '}') {
      depth--
      // Back at depth 1 means a direct child of the array just closed.
      if (depth === 1) elementEnds.push(i + 1)
      if (depth === 0) {
        arrayEnd = i + 1
        break
      }
    }
  }

  const parseArray = (end: number): unknown[] | null => {
    const text =
      end === arrayEnd ? raw.slice(start, end) : `${raw.slice(start, end)}]`
    try {
      const parsed: unknown = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  if (arrayEnd !== -1) {
    const wholeArray = parseArray(arrayEnd)
    if (wholeArray !== null) {
      // The array itself is intact, so `JSON.parse` must have choked on text
      // outside it — a stray prose preamble or a duplicated tail. Returning the
      // array beats letting the caller drop every event over junk we can ignore.
      const hasJunkOutside =
        raw.slice(0, start).trim() !== '' || raw.slice(arrayEnd).trim() !== ''
      return hasJunkOutside && wholeArray.length > 0 ? wholeArray : null
    }
  }

  // Longest first. An unescaped quote desynchronises the string tracking above,
  // so a boundary the scan reported may sit inside a broken element; the longest
  // candidate that actually parses is the real end of the good run.
  for (const end of [...elementEnds].reverse()) {
    const parsed = parseArray(end)
    if (parsed !== null && parsed.length > 0) return parsed
  }

  return null
}
