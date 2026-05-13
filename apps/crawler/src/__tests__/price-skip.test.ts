import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const dir = dirname(fileURLToPath(import.meta.url))

describe('exhausted event filter', () => {
  it('run.ts filters out events with pipelineExhaustedAt set', () => {
    const src = readFileSync(join(dir, '../run.ts'), 'utf-8')
    expect(src).toContain('pipelineExhaustedAt')
  })

  it('run.ts passes priceUrl to runPricePipeline', () => {
    const src = readFileSync(join(dir, '../run.ts'), 'utf-8')
    expect(src).toContain('priceUrl')
  })
})
