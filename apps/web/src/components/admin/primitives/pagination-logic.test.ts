import { describe, it, expect } from 'vitest'
import { derivePagination, pageWindow } from './pagination-logic'

describe('pageWindow', () => {
  it('returns [1] when there is a single page', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(1, 0)).toEqual([1])
  })

  it('returns the full sequence with no ellipses when current is near the middle of a small total', () => {
    // current=3, totalPages=5, delta=1 → left=2, right=4, no collapse
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('still emits an ellipsis when only one page would be collapsed (matches design source)', () => {
    // current=2, totalPages=5, delta=1 → right=3, totalPages-1=4 → '…' even though
    // it stands in for a single page. Matches the design handoff exactly.
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, '…', 5])
  })

  it('collapses the right side with an ellipsis when current is near the start', () => {
    expect(pageWindow(2, 49)).toEqual([1, 2, 3, '…', 49])
  })

  it('collapses the left side with an ellipsis when current is near the end', () => {
    expect(pageWindow(48, 49)).toEqual([1, '…', 47, 48, 49])
  })

  it('shows both ellipses when current is somewhere in the middle', () => {
    expect(pageWindow(5, 49)).toEqual([1, '…', 4, 5, 6, '…', 49])
  })

  it('respects the delta parameter for the window width', () => {
    expect(pageWindow(10, 50, 2)).toEqual([1, '…', 8, 9, 10, 11, 12, '…', 50])
  })
})

describe('derivePagination', () => {
  it('clamps the page down when the requested page is past the last', () => {
    expect(
      derivePagination({ page: 99, pageSize: 20, total: 50 }),
    ).toMatchObject({
      page: 3,
      totalPages: 3,
      atLast: true,
      atFirst: false,
    })
  })

  it('clamps the page up to 1 when zero or negative is supplied', () => {
    expect(
      derivePagination({ page: 0, pageSize: 20, total: 50 }),
    ).toMatchObject({
      page: 1,
      atFirst: true,
    })
  })

  it('returns zero-range + single-page flags when total is 0', () => {
    expect(derivePagination({ page: 1, pageSize: 20, total: 0 })).toMatchObject(
      {
        start: 0,
        end: 0,
        totalPages: 1,
        singlePage: true,
      },
    )
  })

  it('returns the right offset for a middle page', () => {
    expect(
      derivePagination({ page: 3, pageSize: 20, total: 100 }),
    ).toMatchObject({
      offset: 40,
      limit: 20,
      start: 41,
      end: 60,
    })
  })

  it('returns end clamped to total on the last (short) page', () => {
    expect(
      derivePagination({ page: 5, pageSize: 20, total: 87 }),
    ).toMatchObject({
      start: 81,
      end: 87,
      atLast: true,
    })
  })

  it('flags singlePage when there is exactly one page worth of rows', () => {
    expect(
      derivePagination({ page: 1, pageSize: 20, total: 15 }),
    ).toMatchObject({
      totalPages: 1,
      singlePage: true,
    })
  })
})
