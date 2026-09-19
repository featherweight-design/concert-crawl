import { describe, it, expect } from 'vitest'
import {
  decodeIntent,
  encodeIntent,
  sanitizeReturnPath,
  sanitizeDestinationLabel,
  buildReturnUrl,
  stripIntentParams,
  appendPendingTier,
  DEFAULT_RETURN_PATH,
} from './intent'

const ID = '3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01'

describe('intent codec (#794)', () => {
  it('round-trips a watch intent', () => {
    expect(
      decodeIntent(encodeIntent({ action: 'watch', eventId: ID })),
    ).toEqual({ action: 'watch', eventId: ID })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['action only', 'watch'],
    ['non-uuid id', 'watch:not-a-uuid'],
    ['unknown action', `delete:${ID}`],
    ['extra separator', `watch:${ID}:extra`],
    ['prototype payload', '{"__proto__":{}}'],
    ['empty action', `:${ID}`],
    ['empty id', 'watch:'],
  ])('returns null for %s instead of throwing', (_label, raw) => {
    expect(decodeIntent(raw)).toBeNull()
  })
})

describe('sanitizeReturnPath (#794)', () => {
  it('keeps a relative in-app path, query string included', () => {
    expect(sanitizeReturnPath('/events/abc?tab=prices')).toBe(
      '/events/abc?tab=prices',
    )
  })

  it.each([
    ['absolute http', 'https://evil.example/steal'],
    ['protocol-relative', '//evil.example'],
    ['backslash-escaped', '/\\evil.example'],
    ['scheme-relative javascript', 'javascript:alert(1)'],
    ['bare path', 'events'],
    ['missing', null],
    // Single-encoded. A naive check that decodes once and then inspects the
    // prefix passes these.
    ['encoded backslash', '/%5Cevil.example'],
    ['encoded double slash', '/%2F%2Fevil.example'],
    // Double-encoded: these survive one decode pass as the single-encoded forms
    // above, which is exactly how a one-pass check gets bypassed.
    ['double-encoded backslash', '/%255Cevil.example'],
    ['double-encoded double slash', '/%252F%252Fevil.example'],
    // Triple, to prove the loop is a loop and not two hardcoded passes.
    ['triple-encoded backslash', '/%25255Cevil.example'],
  ])('falls back to /events for %s', (_label, raw) => {
    expect(sanitizeReturnPath(raw)).toBe(DEFAULT_RETURN_PATH)
  })
})

describe('sanitizeDestinationLabel (#794)', () => {
  it('keeps an ordinary artist name', () => {
    expect(sanitizeDestinationLabel('Geese')).toBe('Geese')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeDestinationLabel('  Geese  ')).toBe('Geese')
  })

  it('flattens control characters that would break a one-line strip', () => {
    expect(sanitizeDestinationLabel('Ge\nese\t!')).toBe('Ge ese !')
  })

  it('caps the length so a long label cannot blow out the strip', () => {
    expect(sanitizeDestinationLabel('x'.repeat(400))).toHaveLength(60)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace only', '   '],
  ])('returns null for %s', (_label, raw) => {
    expect(sanitizeDestinationLabel(raw)).toBeNull()
  })
})

describe('stripIntentParams (#794)', () => {
  it('drops the seam params', () => {
    expect(
      stripIntentParams(
        '/events/e1',
        new URLSearchParams({ intent: `watch:${ID}`, label: 'Geese' }),
      ),
    ).toBe('/events/e1')
  })

  it("keeps the destination's own query params", () => {
    expect(
      stripIntentParams(
        '/events/e1',
        new URLSearchParams({
          tab: 'prices',
          intent: `watch:${ID}`,
          label: 'Geese',
        }),
      ),
    ).toBe('/events/e1?tab=prices')
  })

  it('drops the pending tier alongside them (#1284)', () => {
    // Both seam readers strip through here. If this dropped only the watch
    // params, each one's replace would re-add what the other just removed.
    expect(
      stripIntentParams(
        '/events/e1',
        new URLSearchParams({ intent: `watch:${ID}`, tier: 'premium' }),
      ),
    ).toBe('/events/e1')
  })

  it('leaves a param-free path alone', () => {
    expect(stripIntentParams('/events/e1', new URLSearchParams())).toBe(
      '/events/e1',
    )
  })

  it("keeps the destination's fragment, which buildReturnUrl preserves", () => {
    expect(
      stripIntentParams(
        '/events/e1',
        new URLSearchParams({ intent: `watch:${ID}` }),
        '#lineup',
      ),
    ).toBe('/events/e1#lineup')
  })

  it('keeps a fragment alongside a surviving query', () => {
    expect(
      stripIntentParams(
        '/events/e1',
        new URLSearchParams({ tab: 'prices', label: 'Geese' }),
        '#lineup',
      ),
    ).toBe('/events/e1?tab=prices#lineup')
  })
})

describe('buildReturnUrl (#794)', () => {
  it('appends the intent and label for replay', () => {
    expect(
      buildReturnUrl({
        returnPath: '/events/e1',
        intent: `watch:${ID}`,
        label: 'Geese',
      }),
    ).toBe(`/events/e1?intent=watch%3A${ID}&label=Geese`)
  })

  it('omits the label when there is none', () => {
    expect(
      buildReturnUrl({
        returnPath: '/events/e1',
        intent: `watch:${ID}`,
        label: null,
      }),
    ).toBe(`/events/e1?intent=watch%3A${ID}`)
  })

  it('returns a bare path when there is nothing to replay', () => {
    expect(
      buildReturnUrl({
        returnPath: '/events/e1',
        intent: null,
        label: 'Geese',
      }),
    ).toBe('/events/e1')
  })

  it('merges into a return path that already has a query string', () => {
    expect(
      buildReturnUrl({
        returnPath: '/events/e1?tab=prices',
        intent: `watch:${ID}`,
        label: 'Geese',
      }),
    ).toBe(`/events/e1?tab=prices&intent=watch%3A${ID}&label=Geese`)
  })

  it('preserves a hash on the return path', () => {
    expect(
      buildReturnUrl({
        returnPath: '/events/e1#lineup',
        intent: `watch:${ID}`,
        label: null,
      }),
    ).toBe(`/events/e1?intent=watch%3A${ID}#lineup`)
  })

  it('still refuses an off-origin return path', () => {
    expect(
      buildReturnUrl({
        returnPath: '//evil.example',
        intent: `watch:${ID}`,
        label: null,
      }),
    ).toBe(`${DEFAULT_RETURN_PATH}?intent=watch%3A${ID}`)
  })
})

describe('appendPendingTier (#1284)', () => {
  it('appends the tier to a bare path', () => {
    expect(appendPendingTier('/events/e1', 'premium')).toBe(
      '/events/e1?tier=premium',
    )
  })

  it('merges into an existing query rather than opening a second one', () => {
    expect(appendPendingTier('/events/e1?tab=prices', 'premium')).toBe(
      '/events/e1?tab=prices&tier=premium',
    )
  })

  it('rides alongside the watch seam params', () => {
    expect(
      appendPendingTier(
        buildReturnUrl({
          returnPath: '/events/e1',
          intent: `watch:${ID}`,
          label: 'Geese',
        }),
        'supporter',
      ),
    ).toBe(`/events/e1?intent=watch%3A${ID}&label=Geese&tier=supporter`)
  })

  it('preserves a fragment', () => {
    expect(appendPendingTier('/events/e1#lineup', 'founder')).toBe(
      '/events/e1?tier=founder#lineup',
    )
  })

  it('replaces a tier the path already carries', () => {
    expect(appendPendingTier('/events/e1?tier=free', 'premium')).toBe(
      '/events/e1?tier=premium',
    )
  })

  it.each([
    ['null', null],
    ['empty', ''],
  ])('leaves the path untouched for %s', (_label, tier) => {
    expect(appendPendingTier('/events/e1?tab=prices', tier)).toBe(
      '/events/e1?tab=prices',
    )
  })
})
