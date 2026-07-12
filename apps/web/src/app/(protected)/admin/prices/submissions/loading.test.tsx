// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PricesSubmissionsLoading from './loading'

describe('PricesSubmissionsLoading', () => {
  it('renders one filter-pill skeleton per status filter', () => {
    // Guards against the skeleton reflowing when the real rail mounts: the
    // page exposes six status filters (All/Pending/Corroborated/Disputed/
    // Stale/Archived), so the placeholder rail must render six pills.
    const { getByTestId } = render(<PricesSubmissionsLoading />)
    const rail = getByTestId('filter-rail-skeleton')
    expect(rail.querySelectorAll('.admin-skeleton')).toHaveLength(6)
  })
})
