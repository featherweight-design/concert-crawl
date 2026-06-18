// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaveBar } from './SaveBar'

describe('SaveBar', () => {
  it('renders nothing when clean and not saving', () => {
    const { container } = render(
      <SaveBar
        dirty={false}
        saving={false}
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it('renders the dirty message when dirty', () => {
    render(
      <SaveBar dirty saving={false} onSave={() => {}} onDiscard={() => {}} />,
    )
    expect(screen.getByText('You have unsaved changes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeTruthy()
  })

  it('disables Save while saving and shows the saving label', () => {
    render(<SaveBar dirty saving onSave={() => {}} onDiscard={() => {}} />)
    expect(
      (screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  it('invokes onSave when clicked', () => {
    const onSave = vi.fn()
    render(
      <SaveBar dirty saving={false} onSave={onSave} onDiscard={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalled()
  })

  it('renders the error string when provided', () => {
    render(
      <SaveBar
        dirty
        saving={false}
        error="Failed to save."
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    )
    expect(screen.getByText('Failed to save.')).toBeTruthy()
  })
})
