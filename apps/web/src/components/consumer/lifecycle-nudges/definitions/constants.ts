// Data constants for the lifecycle nudges (PR 4.2). Customer-facing
// strings live in copy.ts.

import type { TierKey } from '@/components/consumer/tier-picker/definitions/types'

// Browser-session marker (spec Decision 9) — set once per sessionStorage
// lifetime and passed to GET /v1/users/me as ?sessionStartedAt=.
export const SESSION_STARTED_AT_KEY = 'cc-session-started-at'

// The day-13 banner pins above the app bar (app bar/bottom nav are z-40,
// feature-drop pill z-80, ModalShell 90/100) but below modal surfaces.
export const DAY13_BANNER_Z_INDEX = 60

// The past-due banner shares the day-13 layer — the server predicates
// make the two mutually exclusive (a trial user can't be past_due), so
// they never stack and sharing the z-index is safe.
export const PAST_DUE_BANNER_Z_INDEX = DAY13_BANNER_Z_INDEX

// Mobile takeover accordion opens with the recommended tier expanded
// (design: TakeoverPickerMobile initial open state).
export const TAKEOVER_DEFAULT_EXPANDED_TIER: TierKey = 'premium'
