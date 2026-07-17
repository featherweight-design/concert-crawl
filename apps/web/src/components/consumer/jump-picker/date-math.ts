/*
 * The `YearMonth`/`MatrixCell` contract uses single-letter fields (`y`, `m`, `d`)
 * that JumpPicker + CalendarView read directly; `id-length` still flags those keys
 * in object *literals* (it exempts interface members), so relax the rule for
 * property names in this file while keeping it for variables and parameters.
 */
/* eslint id-length: ["error", { "min": 2, "exceptions": ["i", "j", "k", "x", "y", "z", "_"], "properties": "never" }] */

export interface YearMonth {
  y: number
  m: number
}

export interface MatrixCell {
  y: number
  m: number
  d: number
  iso: string
  inMonth: boolean
  dow: number
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Human-readable "Month YYYY" for the jump-picker cue, derived from an ISO
// (YYYY-MM-DD) date so the label tracks the current selection.
export function monthLabelFor(selectedIso: string): string {
  const parts = selectedIso.split('-').map(Number)
  const year = parts[0] ?? 0
  const monthIndex = (parts[1] ?? 1) - 1
  return `${MONTHS[monthIndex] ?? ''} ${year}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function ymdKey(year: number, month: number, day: number): number {
  return year * 10000 + (month + 1) * 100 + day
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const total = ym.y * 12 + ym.m + delta
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
}

export function monthMatrix(year: number, month: number): MatrixCell[] {
  const startDow = new Date(year, month, 1).getDay() // Sunday-first (0=Sun)
  const gridStart = new Date(year, month, 1 - startDow)
  const cells: MatrixCell[] = []
  for (let i = 0; i < 42; i += 1) {
    const cur = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    )
    const cellYear = cur.getFullYear()
    const cellMonth = cur.getMonth()
    const cellDay = cur.getDate()
    cells.push({
      y: cellYear,
      m: cellMonth,
      d: cellDay,
      iso: isoOf(cellYear, cellMonth, cellDay),
      inMonth: cellMonth === month && cellYear === year,
      dow: cur.getDay(),
    })
  }
  return cells
}

export function pickerWindow(todayISO: string): {
  from: string
  to: string
  min: YearMonth
  max: YearMonth
} {
  const parts = todayISO.split('-').map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const min: YearMonth = { y: year, m: month - 1 }
  const max = addMonths(min, 12)
  const from = isoOf(min.y, min.m, 1)
  const lastDay = new Date(max.y, max.m + 1, 0).getDate()
  const to = isoOf(max.y, max.m, lastDay)
  return { from, to, min, max }
}

// Monday-based whole-week delta, matching currentWeekDays' week boundaries.
export function weekOffsetForDate(targetISO: string, todayISO: string): number {
  const mondayOf = (iso: string): number => {
    const parts = iso.split('-').map(Number)
    const year = parts[0] ?? 0
    const month = parts[1] ?? 1
    const day = parts[2] ?? 1
    // Use UTC-noon to avoid DST/tz shift, mirroring definitions/lib.
    const base = Date.UTC(year, month - 1, day, 12)
    const dow = new Date(base).getUTCDay() // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    return base + mondayOffset * 86_400_000
  }
  const diffMs = mondayOf(targetISO) - mondayOf(todayISO)
  return Math.round(diffMs / (7 * 86_400_000))
}
