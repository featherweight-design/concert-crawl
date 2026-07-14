import { describe, it, expect } from 'vitest'

import type { AuditManifest } from './manifest-types.js'
import { filterManifest, outputPathFor, parseCliTags } from './sweep-helpers.js'

describe('filterManifest', () => {
  const manifest: AuditManifest = [
    { id: 'a', path: '/a', tags: ['consumer'], auth: 'none' },
    { id: 'b', path: '/b', tags: ['admin'], auth: 'admin' },
    { id: 'c', path: '/c', tags: ['consumer', 'admin'], auth: 'user' },
  ]

  it('returns everything when no tags given', () => {
    expect(
      filterManifest(manifest, undefined).map((route) => route.id),
    ).toEqual(['a', 'b', 'c'])
  })

  it('filters by admin tag', () => {
    expect(
      filterManifest(manifest, ['admin']).map((route) => route.id),
    ).toEqual(['b', 'c'])
  })
})

describe('outputPathFor', () => {
  it('builds the canonical filename', () => {
    expect(
      outputPathFor(
        '2026-07-12T18-04-11',
        'admin-feedback',
        'expand-first-card',
        '390x844',
        'png',
      ),
    ).toBe(
      'audit-output/2026-07-12T18-04-11/admin-feedback__expand-first-card__390x844.png',
    )
  })
})

describe('parseCliTags', () => {
  it('parses --tags=admin,consumer (equals form)', () => {
    expect(parseCliTags(['--tags=admin,consumer'])).toEqual([
      'admin',
      'consumer',
    ])
  })

  it('parses --tags admin (space form)', () => {
    expect(parseCliTags(['--tags', 'admin'])).toEqual(['admin'])
  })

  it('returns undefined for --tags= with no value', () => {
    expect(parseCliTags(['--tags='])).toBeUndefined()
  })

  it('returns undefined when --tags flag is absent', () => {
    expect(parseCliTags([])).toBeUndefined()
  })
})
