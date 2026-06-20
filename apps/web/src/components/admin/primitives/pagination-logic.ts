// Pure pagination logic — extracted so the page-window math and clamp
// behavior can be unit-tested without a React renderer. The hook + the UI
// component live next door and call into these.

export const PAGINATION_DEFAULT_PAGE_SIZE = 20
export const PAGINATION_PAGE_SIZE_OPTIONS = [20, 50, 100] as const

// Returns the button sequence the desktop pager renders, e.g.
// [1, '…', 4, 5, 6, '…', 49]. First + last are always present, the window
// is current ± delta in the middle, and '…' marks where pages collapsed.
// Returns [1] for the single-page case.
export const pageWindow = (
  current: number,
  totalPages: number,
  delta: number = 1,
): Array<number | '…'> => {
  if (totalPages <= 1) return [1]
  const left = Math.max(2, current - delta)
  const right = Math.min(totalPages - 1, current + delta)
  const out: Array<number | '…'> = [1]
  if (left > 2) out.push('…')
  for (let idx = left; idx <= right; idx++) out.push(idx)
  if (right < totalPages - 1) out.push('…')
  out.push(totalPages)
  return out
}

// Derives the full pager state from the controlled `page` + `pageSize` and
// the server-reported `total`. Pure function — UI consumers pass the result
// straight into <Pagination/> props.
export const derivePagination = (input: {
  page: number
  pageSize: number
  total: number
}): {
  page: number
  pageSize: number
  total: number
  totalPages: number
  start: number
  end: number
  offset: number
  limit: number
  atFirst: boolean
  atLast: boolean
  singlePage: boolean
} => {
  // `toInt` truncates safely without the 32-bit wrap that `| 0` would cause
  // for very large counts. Non-finite values fall back to 0 so a stray NaN
  // can't propagate into the math below.
  const toInt = (raw: number): number =>
    Number.isFinite(raw) ? Math.trunc(raw) : 0
  const total = Math.max(0, toInt(input.total))
  const pageSize = Math.max(1, toInt(input.pageSize))
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, toInt(input.page)), totalPages)
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return {
    page,
    pageSize,
    total,
    totalPages,
    start,
    end,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    atFirst: page <= 1,
    atLast: page >= totalPages,
    singlePage: totalPages <= 1 || total === 0,
  }
}
