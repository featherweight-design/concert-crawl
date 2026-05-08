import { describe, it, expect } from 'vitest'
import { isLocalConnectionString } from './connection.js'

describe('isLocalConnectionString', () => {
  it('returns true for localhost', () => {
    expect(
      isLocalConnectionString(
        'postgresql://postgres:postgres@localhost:5433/db',
      ),
    ).toBe(true)
  })

  it('returns true for 127.0.0.1', () => {
    expect(
      isLocalConnectionString(
        'postgresql://postgres:postgres@127.0.0.1:5432/db',
      ),
    ).toBe(true)
  })

  it('returns true for ::1 (IPv6 loopback)', () => {
    expect(
      isLocalConnectionString('postgresql://postgres:postgres@[::1]:5432/db'),
    ).toBe(true)
  })

  it('returns false for a remote Render host', () => {
    expect(
      isLocalConnectionString(
        'postgresql://user:pass@dpg-abc123-a.oregon-postgres.render.com:5432/concert_crawl',
      ),
    ).toBe(false)
  })

  it('returns false for a remote host whose name contains "localhost" as a substring', () => {
    expect(
      isLocalConnectionString(
        'postgresql://user:pass@not-localhost.example.com:5432/db',
      ),
    ).toBe(false)
  })
})
