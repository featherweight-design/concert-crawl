// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PickGenres } from './PickGenres'
import { ONBOARDING_COPY } from '../definitions/copy'

const copy = ONBOARDING_COPY.pickGenres

afterEach(cleanup)

describe('PickGenres', () => {
  it('renders one checkbox per bucket inside a labelled group', () => {
    render(
      <PickGenres
        genres={['punk', 'jazz']}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    )
    const group = screen.getByRole('group', { name: copy.groupLabel })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('reports selection through aria-checked, not colour alone', () => {
    render(
      <PickGenres
        genres={['punk', 'jazz']}
        selected={new Set(['punk'])}
        onToggle={vi.fn()}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'punk' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('checkbox', { name: 'jazz' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('gives every chip a 44px thumb target', () => {
    render(
      <PickGenres genres={['punk']} selected={new Set()} onToggle={vi.fn()} />,
    )
    expect(screen.getByRole('checkbox', { name: 'punk' })).toHaveStyle({
      minHeight: '44px',
    })
  })

  it('toggles by bucket label', () => {
    const onToggle = vi.fn()
    render(
      <PickGenres
        genres={['punk', 'jazz']}
        selected={new Set()}
        onToggle={onToggle}
      />,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'jazz' }))
    expect(onToggle).toHaveBeenCalledWith('jazz')
  })

  it('says so rather than showing an empty group when buckets fail to load', () => {
    render(<PickGenres genres={[]} selected={new Set()} onToggle={vi.fn()} />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByText(copy.empty)).toBeInTheDocument()
  })
})
