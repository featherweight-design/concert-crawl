import { describe, it, expect } from 'vitest'
import { salvageJsonArrayPrefix } from './salvage-json-array.js'

describe('salvageJsonArrayPrefix', () => {
  it('recovers the complete elements ahead of a truncated tail', () => {
    const raw = '[{"title":"One"},{"title":"Two"},{"title":"Thr'

    expect(salvageJsonArrayPrefix(raw)).toEqual([
      { title: 'One' },
      { title: 'Two' },
    ])
  })

  it('recovers elements ahead of an unescaped quote mid-value', () => {
    const raw =
      '[{"title":"One"},{"title":"He said "hi" loudly"},{"title":"X"}]'

    expect(salvageJsonArrayPrefix(raw)).toEqual([{ title: 'One' }])
  })

  it('keeps nested objects and arrays intact', () => {
    const raw =
      '[{"title":"One","support":["A","B"],"meta":{"nested":{"deep":1}}},{"title":"Tw'

    expect(salvageJsonArrayPrefix(raw)).toEqual([
      { title: 'One', support: ['A', 'B'], meta: { nested: { deep: 1 } } },
    ])
  })

  it('is not fooled by brackets inside string values', () => {
    const raw = '[{"title":"Set [1] {live}"},{"title":"Tw'

    expect(salvageJsonArrayPrefix(raw)).toEqual([{ title: 'Set [1] {live}' }])
  })

  it('handles escaped quotes and backslashes inside string values', () => {
    const raw = '[{"title":"a \\" b \\\\"},{"title":"Tw'

    expect(salvageJsonArrayPrefix(raw)).toEqual([{ title: 'a " b \\' }])
  })

  it('recovers an intact array that JSON.parse rejects over trailing junk', () => {
    const raw = '[{"title":"One"},{"title":"Two"}] and here is my explanation'

    expect(salvageJsonArrayPrefix(raw)).toEqual([
      { title: 'One' },
      { title: 'Two' },
    ])
  })

  it('recovers an intact array behind a prose preamble', () => {
    const raw = 'Here are the events: [{"title":"One"}]'

    expect(salvageJsonArrayPrefix(raw)).toEqual([{ title: 'One' }])
  })

  it('returns null when the array is well formed, leaving JSON.parse to own it', () => {
    expect(salvageJsonArrayPrefix('[{"title":"One"}]')).toBeNull()
  })

  it('returns null when the first element is already broken', () => {
    expect(salvageJsonArrayPrefix('[{"title":"On')).toBeNull()
  })

  it('returns null when there is no array at all', () => {
    expect(salvageJsonArrayPrefix('not json')).toBeNull()
  })

  it('returns null for an empty array', () => {
    expect(salvageJsonArrayPrefix('[]')).toBeNull()
  })
})
