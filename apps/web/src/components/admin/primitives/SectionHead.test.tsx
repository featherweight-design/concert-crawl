// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionHead } from './SectionHead'

describe('SectionHead (#986)', () => {
  it('sets overflowWrap: anywhere on the H1 so long @handles break rather than clip', () => {
    render(
      <SectionHead title="@AReallyLongUnbrokenHandleThatWouldOverflowAt320px" />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.style.overflowWrap).toBe('anywhere')
  })

  it('gives the title column minWidth: 0 so it can shrink inside the flex row', () => {
    // Without min-width: 0, the flex-child column would size to the H1's
    // widest unbreakable token and pin the row wider than the viewport at
    // 320px, defeating the overflow-wrap rule.
    const { container } = render(<SectionHead title="@handle" />)
    const flexRow = container.firstElementChild as HTMLElement
    const titleColumn = flexRow.firstElementChild as HTMLElement
    expect(titleColumn.style.minWidth).toBe('0px')
  })
})
