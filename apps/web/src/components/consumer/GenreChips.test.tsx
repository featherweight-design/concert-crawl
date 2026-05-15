// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GenreChips } from './GenreChips'

describe('GenreChips', () => {
  it('renders a chip for each genre', () => {
    render(<GenreChips genres={['pop', 'jazz']} />)
    expect(screen.getByText('pop')).toBeTruthy()
    expect(screen.getByText('jazz')).toBeTruthy()
  })

  it('renders nothing when genres is null', () => {
    const { container } = render(<GenreChips genres={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when genres is an empty array', () => {
    const { container } = render(<GenreChips genres={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('applies className to the container', () => {
    render(<GenreChips genres={['rock']} className="mt-2" />)
    const wrapper = screen.getByText('rock').parentElement
    expect(wrapper?.classList.contains('mt-2')).toBe(true)
  })

  it('respects maxChips by truncating the list', () => {
    render(<GenreChips genres={['pop', 'jazz', 'rock', 'soul']} maxChips={3} />)
    expect(screen.getByText('pop')).toBeTruthy()
    expect(screen.getByText('jazz')).toBeTruthy()
    expect(screen.getByText('rock')).toBeTruthy()
    expect(screen.queryByText('soul')).toBeNull()
  })
})
