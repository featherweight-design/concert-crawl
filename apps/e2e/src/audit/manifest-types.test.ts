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
  it('rejects route ids containing path-unsafe characters', () => {
    // route.id ends up in output filenames — `/`, `..`, or backslash would
    // escape audit-output/<runId>/. Regression guard.
    expect(() =>
      validateManifest([
        { id: 'admin/feedback', path: '/x', tags: ['admin'], auth: 'admin' },
      ]),
    ).toThrow(/path-safe/i)
    expect(() =>
      validateManifest([
        { id: '..', path: '/x', tags: ['admin'], auth: 'admin' },
      ]),
    ).toThrow(/path-safe/i)
  })
  it('rejects absolute URLs in route.path', () => {
    // route.path is passed to page.goto — an absolute URL would silently
    // escape the PLAYWRIGHT_AUDIT_BASE_URL host scope.
    expect(() =>
      validateManifest([
        {
          id: 'evil',
          path: 'https://prod.concertcrawl.app/admin',
          tags: ['admin'],
          auth: 'admin',
        },
      ]),
    ).toThrow(/same-origin path/i)
  })
})
