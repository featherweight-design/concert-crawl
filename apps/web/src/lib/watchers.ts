import type {
  AvatarColor,
  EventWatcher,
  EventWatchersResponse,
} from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

// How many handles the sentence names before the rest fold into the tail.
// Deliberately small: the surface's job is warmth, not a leaderboard, and we
// don't inflate the list to look busier than the crawl actually is.
export const NAMED_CAP = 3

const TONES: AvatarColor[] = ['signal', 'accent', 'success', 'warning']

export type SentencePart =
  { kind: 'name'; value: string } | { kind: 'text'; value: string }

// djb2 — the same hash the profile monogram uses, so a handle keeps one tone
// everywhere it appears.
function hashHandle(handle: string): number {
  let hash = 5381
  for (let i = 0; i < handle.length; i += 1) {
    hash = ((hash << 5) + hash + handle.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function watcherInitial(handle: string): string {
  const alphanumeric = handle.replace(/[^a-z0-9]/gi, '')
  // Array.from splits by code point, so an emoji handle yields the whole glyph
  // rather than a lone surrogate half.
  const fallback = Array.from(handle)[0]
  return (alphanumeric[0] ?? fallback ?? '?').toUpperCase()
}

export function watcherTone(watcher: EventWatcher): AvatarColor {
  if (watcher.avatarColor) return watcher.avatarColor
  const tone = TONES[hashHandle(watcher.handle) % TONES.length]
  return tone ?? 'signal'
}

interface BuiltWatchers {
  /** The handles the sentence names, capped at NAMED_CAP. */
  shown: EventWatcher[]
  /** Everyone we aren't naming — named overflow plus handle-less watchers. */
  others: number
  total: number
  /** Watchers exist, but none of them have a handle to drop. */
  anonOnly: boolean
}

export function buildWatchers(response: EventWatchersResponse): BuiltWatchers {
  const shown = response.named.slice(0, NAMED_CAP)
  return {
    shown,
    // Clamped so a regressed `total < named.length` contract degrades to "no
    // overflow" rather than rendering a negative "+ -2 more".
    others: Math.max(0, response.total - shown.length),
    total: response.total,
    anonOnly: response.named.length === 0 && response.total > 0,
  }
}

// "a", "a & b", "a, b & c"
function joinNames(names: string[]): SentencePart[] {
  const parts: SentencePart[] = []
  names.forEach((name, index) => {
    if (index > 0) {
      parts.push({
        kind: 'text',
        value: index === names.length - 1 ? ' & ' : ', ',
      })
    }
    parts.push({ kind: 'name', value: name })
  })
  return parts
}

interface WatchersSentence extends BuiltWatchers {
  /** Structured so handles render bold without string-splitting. */
  parts: SentencePart[]
  /** The same sentence as flat prose, for `aria-label`. */
  aria: string
}

/**
 * The one place the social-proof sentence is composed. Display text and
 * screen-reader text are derived from the same parts so they can never drift.
 */
export function watchersToParts(
  response: EventWatchersResponse,
): WatchersSentence {
  const built = buildWatchers(response)
  const copy = CONSUMER_COPY.watchers

  if (built.anonOnly) {
    const sentence = copy.countOnly(built.total)
    return {
      ...built,
      parts: [{ kind: 'text', value: sentence }],
      aria: sentence,
    }
  }

  const names = built.shown.map((watcher) => watcher.handle)
  const tail =
    built.others > 0
      ? ` ${copy.plusOthers(built.others)}`
      : names.length === 1
        ? ` ${copy.one}`
        : ` ${copy.areWatching}`

  const parts: SentencePart[] = [
    ...joinNames(names),
    { kind: 'text', value: tail },
  ]

  return {
    ...built,
    parts,
    aria: parts.map((part) => part.value).join(''),
  }
}
