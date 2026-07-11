// Scarcity-rail view model — derives seats + countdown numbers from the
// public founder-window payload. "Hot" mirrors the design handoff's
// ScarcityRail threshold: ≤15 seats or ≤3 days left.

import type { FounderWindowView } from '@concert-crawl/types'
import { TIER_PICKER_COPY } from '../definitions/copy'
import type { ScarcityRailData } from '../definitions/types'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

export const scarcityRailData = (
  view: FounderWindowView,
  now: Date,
): ScarcityRailData | null => {
  if (view.state !== 'open') return null
  if (view.seatsRemaining === undefined || view.closesAt === null) return null

  const closesAtMs = new Date(view.closesAt).getTime()
  if (Number.isNaN(closesAtMs)) return null

  const remainingMs = Math.max(0, closesAtMs - now.getTime())
  const daysLeft = Math.floor(remainingMs / DAY_MS)
  const hoursLeft = Math.floor((remainingMs % DAY_MS) / HOUR_MS)
  const seatsLeft = view.seatsRemaining
  const seatsClaimed = view.seatsTotal - seatsLeft

  return {
    seatsClaimed,
    seatsTotal: view.seatsTotal,
    seatsLeft,
    daysLeft,
    hoursLeft,
    hot: seatsLeft <= 15 || daysLeft <= 3,
  }
}

export const scarcityTimeText = (rail: ScarcityRailData): string =>
  rail.daysLeft >= 1
    ? TIER_PICKER_COPY.scarcity.daysAndHoursLeft(rail.daysLeft, rail.hoursLeft)
    : TIER_PICKER_COPY.scarcity.hoursLeft(rail.hoursLeft)
