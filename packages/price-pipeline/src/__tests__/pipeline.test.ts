import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('runPricePipeline', () => {
  it('does not import tier 2-5 modules', () => {
    const src = readFileSync(join(__dirname, '../index.ts'), 'utf-8')
    expect(src).not.toContain('tier2-ticketmaster')
    expect(src).not.toContain('tier3-eventbrite')
    expect(src).not.toContain('tier4-songkick')
    expect(src).not.toContain('tier5-seatgeek')
  })
})
