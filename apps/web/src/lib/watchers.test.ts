import { describe, it, expect } from 'vitest'
import type { EventWatcher, EventWatchersResponse } from '@concert-crawl/types'
import {
  NAMED_CAP,
  buildWatchers,
  watcherInitial,
  watcherTone,
  watchersToParts,
} from './watchers'

function named(...handles: string[]): EventWatcher[] {
  return handles.map((handle) => ({ handle, avatarColor: null }))
}

function response(total: number, ...handles: string[]): EventWatchersResponse {
  return { total, named: named(...handles) }
}

/** Flatten `parts` into the sentence a sighted reader sees. */
function renderParts(res: EventWatchersResponse): string {
  return watchersToParts(res)
    .parts.map((part) => part.value)
    .join('')
}

describe('watchersToParts — the four brief §4 states', () => {
  it('names a single watcher', () => {
    const res = response(1, 'marisol')
    expect(renderParts(res)).toBe('marisol is watching this one.')
  })

  it('joins three named watchers with a comma and an ampersand', () => {
    const res = response(3, 'marisol', 'dev_ftw', 'priya')
    expect(renderParts(res)).toBe('marisol, dev_ftw & priya are watching.')
  })

  it('folds everyone beyond the cap into the others tail', () => {
    const res = response(14, 'marisol', 'dev_ftw', 'priya', 'jonah')
    expect(renderParts(res)).toBe(
      'marisol, dev_ftw & priya + 11 more in the crawl, watching.',
    )
  })

  it('degrades to an honest count when nobody has a handle', () => {
    const res = response(14)
    expect(renderParts(res)).toBe('14 in the crawl are watching this one.')
    expect(watchersToParts(res).anonOnly).toBe(true)
  })

  it('renders the same sentence for sighted and screen-reader output', () => {
    const cases: EventWatchersResponse[] = [
      response(1, 'marisol'),
      response(2, 'marisol', 'dev_ftw'),
      response(3, 'marisol', 'dev_ftw', 'priya'),
      response(14, 'marisol', 'dev_ftw', 'priya', 'jonah'),
      response(14),
    ]
    for (const res of cases) {
      expect(watchersToParts(res).aria).toBe(renderParts(res))
    }
  })
})

describe('buildWatchers', () => {
  it('reports nothing to show when there are no other watchers', () => {
    const built = buildWatchers(response(0))
    expect(built.shown).toEqual([])
    expect(built.others).toBe(0)
    expect(built.total).toBe(0)
    expect(built.anonOnly).toBe(false)
  })

  it('caps shown at NAMED_CAP and rolls the remainder into others', () => {
    const built = buildWatchers(
      response(6, 'one', 'two', 'three', 'four', 'five'),
    )
    expect(built.shown).toHaveLength(NAMED_CAP)
    // 2 named beyond the cap + 1 handle-less watcher.
    expect(built.others).toBe(3)
  })

  it('is not anonOnly when at least one watcher has a handle', () => {
    expect(buildWatchers(response(9, 'marisol')).anonOnly).toBe(false)
  })

  it('clamps others at zero if total is ever smaller than the named roster', () => {
    expect(buildWatchers(response(1, 'one', 'two', 'three')).others).toBe(0)
  })
})

describe('watcherInitial', () => {
  it('strips leading non-alphanumerics', () => {
    expect(watcherInitial('_dev_ftw')).toBe('D')
  })

  it('uppercases the first letter', () => {
    expect(watcherInitial('marisol')).toBe('M')
  })

  it('uses a digit when the handle starts with one', () => {
    expect(watcherInitial('7empest')).toBe('7')
  })

  it('falls back to the first character for handles with no alphanumerics', () => {
    expect(watcherInitial('🎸')).toBe('🎸')
  })

  it('never throws on an empty handle', () => {
    expect(() => watcherInitial('')).not.toThrow()
    expect(watcherInitial('')).toBe('?')
  })
})

describe('watcherTone', () => {
  it('prefers the watcher’s chosen avatar color', () => {
    expect(watcherTone({ handle: 'marisol', avatarColor: 'warning' })).toBe(
      'warning',
    )
  })

  it('is stable across calls for the same handle', () => {
    const watcher: EventWatcher = { handle: 'marisol', avatarColor: null }
    expect(watcherTone(watcher)).toBe(watcherTone(watcher))
  })

  it('always resolves to one of the four avatar tones', () => {
    const tones = ['signal', 'accent', 'success', 'warning']
    for (const handle of ['marisol', 'dev_ftw', 'priya', 'jonah', 'sam']) {
      expect(tones).toContain(watcherTone({ handle, avatarColor: null }))
    }
  })
})
