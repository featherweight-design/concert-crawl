import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const svgContent = readFileSync(resolve(dir, 'icon.svg'), 'utf-8')

describe('icon.svg', () => {
  it('contains dark mode media query', () => {
    expect(svgContent).toContain('prefers-color-scheme: dark')
  })

  it('contains Electric dark surface token', () => {
    expect(svgContent).toContain('#171D3A')
  })

  it('contains Light surface token', () => {
    expect(svgContent).toContain('#E8EDF6')
  })

  it('contains signal element', () => {
    expect(svgContent).toContain('#7AE6FF')
  })
})
