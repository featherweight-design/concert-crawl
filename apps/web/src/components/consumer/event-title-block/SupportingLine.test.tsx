// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SupportingLine } from './SupportingLine'

describe('SupportingLine', () => {
  it('renders nothing with no artists', () => {
    const { container } = render(<SupportingLine artists={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('exposes the full roster to screen readers even when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />)
    const group = screen.getByRole('group')
    expect(group.getAttribute('aria-label')).toBe('with A, B, C, and D')
  })

  it('shows a +N more tail when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />)
    expect(screen.getByText('+2 more')).toBeDefined()
  })

  it('drops the separator for a single opener', () => {
    render(<SupportingLine artists={['Solo']} />)
    expect(screen.queryByText('·')).toBeNull()
  })

  it('clips the run to one line on card/hero surfaces', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="card" />,
    )
    const run = container.querySelector('span.min-w-0')
    expect(run?.className).toContain('truncate')
  })

  it('lets the full roster wrap on the detail surface', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="detail" />,
    )
    const run = container.querySelector('span.min-w-0')
    expect(run?.className).toContain('whitespace-normal')
    expect(run?.className).not.toContain('truncate')
  })
})
