// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditField } from './EditField'
import { SrcTag } from './SrcTag'
import { LifecycleBadge } from './LifecycleBadge'
import { VerifyMark } from './VerifyMark'

describe('EditField — read-only render', () => {
  it('renders a text-type value with the label above', () => {
    render(<EditField label="Title" type="text" value="Lord Huron" />)
    expect(screen.getByText('Title')).toBeTruthy()
    expect(screen.getByText('Lord Huron')).toBeTruthy()
  })

  it('renders placeholder when value is empty', () => {
    render(<EditField label="Title" type="text" placeholder="Event title" />)
    expect(screen.getByText('Event title')).toBeTruthy()
  })

  it('renders error message when error prop is set', () => {
    render(
      <EditField
        label="Show"
        type="time"
        value="8:00 PM"
        error="Must be after doors"
      />,
    )
    expect(screen.getByText('Must be after doors')).toBeTruthy()
  })

  it('renders help text only when no error is set', () => {
    render(
      <EditField
        label="Date"
        type="text"
        value="Jun 20"
        help="Mountain Time"
      />,
    )
    expect(screen.getByText('Mountain Time')).toBeTruthy()
  })

  it('renders empty placeholder for empty tag list', () => {
    render(<EditField label="Genre tags" type="tags" tags={[]} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('renders each tag for a populated tag list', () => {
    render(
      <EditField label="Genre tags" type="tags" tags={['indie', 'folk']} />,
    )
    expect(screen.getByText('indie')).toBeTruthy()
    expect(screen.getByText('folk')).toBeTruthy()
  })

  it('renders mono value for type=mono', () => {
    render(
      <EditField label="Updated" type="mono" value="May 14 · 12:14 by crawl" />,
    )
    expect(screen.getByText('May 14 · 12:14 by crawl')).toBeTruthy()
  })
})

describe('SrcTag', () => {
  it('renders the source label for known sources', () => {
    render(<SrcTag source="llm" />)
    expect(screen.getByText('llm')).toBeTruthy()
  })

  it('renders the "no source" copy for null', () => {
    render(<SrcTag source={null} />)
    expect(screen.getByText('no source')).toBeTruthy()
  })
})

describe('LifecycleBadge', () => {
  it('shows the correct label per status', () => {
    const { rerender } = render(<LifecycleBadge status="upcoming" />)
    expect(screen.getByText('Upcoming')).toBeTruthy()
    rerender(<LifecycleBadge status="postponed" />)
    expect(screen.getByText('Postponed')).toBeTruthy()
    rerender(<LifecycleBadge status="cancelled" />)
    expect(screen.getByText('Cancelled')).toBeTruthy()
  })
})

describe('VerifyMark', () => {
  it('renders Verified when verified=true', () => {
    render(<VerifyMark verified />)
    expect(screen.getByText('Verified')).toBeTruthy()
  })

  it('renders Unverified when verified=false', () => {
    render(<VerifyMark verified={false} />)
    expect(screen.getByText('Unverified')).toBeTruthy()
  })
})
