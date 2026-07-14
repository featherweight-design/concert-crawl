import { describe, it, expect } from 'vitest'
import { validateManifest } from './manifest-types.js'

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(() =>
      validateManifest([
        { id: 'a', path: '/a', tags: ['consumer'], auth: 'none' },
        { id: 'b', path: '/b', tags: ['admin'], auth: 'admin' },
      ]),
    ).not.toThrow()
  })
  it('rejects duplicate route ids', () => {
    expect(() =>
      validateManifest([
        { id: 'a', path: '/a', tags: ['consumer'], auth: 'none' },
        { id: 'a', path: '/a2', tags: ['consumer'], auth: 'none' },
      ]),
    ).toThrow(/duplicate route id/i)
  })
  it('rejects empty tags', () => {
    expect(() =>
      validateManifest([{ id: 'a', path: '/a', tags: [], auth: 'none' }]),
    ).toThrow(/at least one tag/i)
  })
  it('rejects unknown tag values', () => {
    expect(() =>
      validateManifest([
        { id: 'a', path: '/a', tags: ['marketing'], auth: 'none' },
      ]),
    ).toThrow()
  })
})
